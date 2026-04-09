const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');
const catalogAnalysisService = require('./catalogAnalysisService');
const visualDnaCache = require('./visualDnaCache');
const tizitaService = require('./tizitaServiceDirect');
const projectDnaService = require('./projectDnaService');
const subtasteService = require('./subtasteService');
const ibisService = require('./ibisService');

/**
 * AI Twin Service
 * Generates content using LLM trained on user's aesthetic DNA
 * DIFFERENTIATOR: Personal AI trained on YOUR proven taste, not generic ChatGPT
 */
class AITwinService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    this.provider = process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai';
    // Using Haiku - upgrade API key tier for Sonnet access
    this.model = this.provider === 'anthropic' ? 'claude-3-haiku-20240307' : 'gpt-4';
    this.dbPath = path.join(__dirname, '../../starforge_audio.db');
  }

  /**
   * Get user's writing samples for voice training (dual-layer)
   */
  getWritingSamples(userId) {
    try {
      const db = new Database(this.dbPath);
      const samples = db.prepare(`
        SELECT social_posts, subconscious_writing
        FROM user_writing_samples
        WHERE user_id = ?
      `).get(userId);
      db.close();

      if (!samples) return null;

      return {
        social: samples.social_posts || null,
        subconscious: samples.subconscious_writing || null
      };
    } catch (error) {
      console.error('Error getting writing samples:', error);
      return null;
    }
  }

  /**
   * Get complete aesthetic DNA for user
   * Combines Visual DNA + Audio DNA + Taste Profile + Writing Samples
   */
  async getAestheticDNA(userId) {
    try {
      // Get Audio DNA from catalog analysis
      const audioDNA = await catalogAnalysisService.getCatalogAnalysis(userId);

      // Get Visual DNA from Tizita
      const tizitaProfile = tizitaService.getUserProfile(userId === 'default_user' ? 1 : userId);
      let visualDNA = null;

      if (tizitaProfile && tizitaProfile.stats.total_photos > 0) {
        const photos = tizitaService.getTopPhotos(userId === 'default_user' ? 1 : userId, 50, 0.60);
        if (photos && photos.length > 0) {
          visualDNA = visualDnaCache.getCached(userId === 'default_user' ? 1 : userId, photos);
        }
      }

      // Get Influence Genealogy if available
      let influenceGenealogy = null;
      if (audioDNA.influenceGenealogy) {
        influenceGenealogy = audioDNA.influenceGenealogy;
      }

      // Get Writing Samples for voice training
      const writingSamples = this.getWritingSamples(userId);

      // Get WritingDNA from Ibis (5th identity signal)
      let writingDNA = null;
      try {
        writingDNA = await ibisService.getCached(userId);
      } catch (err) {
        console.warn('[aiTwin] Failed to fetch WritingDNA:', err.message);
      }

      // Get Project DNA (highest-conviction identity signal)
      const projectDNA = projectDnaService.getProjectDNA(userId === 'default_user' ? 'default' : userId);

      // Run Subtaste classification from all available signals (now includes WritingDNA)
      const subtasteResult = subtasteService.classifyUser({
        audioDNA: audioDNA,
        visualDNA: visualDNA,
        writingSamples: writingSamples,
        projectDNA: projectDNA,
        writingDNA: writingDNA,
      });

      return {
        available: true,
        audio: {
          trackCount: audioDNA.trackCount,
          avgBpm: audioDNA.aggregateStats?.avgBpm,
          avgEnergy: audioDNA.aggregateStats?.avgEnergy,
          avgValence: audioDNA.aggregateStats?.avgValence,
          genres: audioDNA.genreDistribution?.slice(0, 5).map(g => g.genre),
          tasteCoherence: audioDNA.tasteCoherence?.overall,
          influences: influenceGenealogy?.genealogy?.map(g => g.genre).slice(0, 5) || []
        },
        visual: visualDNA ? {
          styleDescription: visualDNA.styleDescription,
          colorPalette: visualDNA.colorPalette?.map(c => c.name).slice(0, 5),
          paletteCharacteristics: visualDNA.paletteCharacteristics,
          themes: visualDNA.dominantThemes?.slice(0, 5)
        } : null,
        writingSamples: writingSamples,
        writingDNA: writingDNA,
        projectDNA: projectDNA,
        subtaste: subtasteResult?.classification || null,
      };
    } catch (error) {
      console.error('Error getting aesthetic DNA:', error);
      return { available: false, error: error.message };
    }
  }

  /**
   * Build context prompt from aesthetic DNA
   */
  buildAestheticContext(aestheticDNA) {
    const { audio, visual, writingSamples, writingDNA, projectDNA, subtaste } = aestheticDNA;

    let context = '';

    // CORE IDENTITY — Project DNA is the highest-conviction signal
    if (projectDNA && projectDNA.coreIdentity) {
      const ci = projectDNA.coreIdentity;
      context += 'CORE IDENTITY (from Project DNA — highest conviction, non-negotiable):\n';
      context += `Thesis: ${ci.thesis}\n`;
      context += `Domains: ${(ci.domains || []).join(', ')}\n`;
      context += `Tools: ${(ci.tools || []).join(', ')}\n`;
      context += `References: ${(ci.references || []).join(', ')}\n`;
      context += `\nANTI-TASTE (explicit rejections — content must NOT sound like these):\n`;
      context += `${(ci.antiTaste || []).join(', ')}\n`;
      if (projectDNA.tone) {
        context += `\nTone register: ${projectDNA.tone.register}\n`;
        context += `Preserve these terms untranslated: ${(projectDNA.tone.preserveTerms || []).join(', ')}\n`;
      }
      context += '\n';
    }

    // Subtaste archetype classification
    if (subtaste) {
      context += 'ARCHETYPE CLASSIFICATION:\n';
      if (subtaste.primary) {
        context += `Primary: ${subtaste.primary.glyph} (${subtaste.primary.designation}) — ${subtaste.primary.creativeMode}\n`;
        context += `"${subtaste.primary.essence}"\n`;
      }
      if (subtaste.secondary) {
        context += `Secondary: ${subtaste.secondary.glyph} — ${subtaste.secondary.creativeMode}\n`;
      }
      context += '\n';
    }

    context += 'Artist Profile:\n\n';

    // Audio DNA
    if (audio) {
      context += `Music Taste:\n`;
      context += `- ${audio.trackCount} tracks analyzed\n`;
      context += `- BPM preference: ${audio.avgBpm?.toFixed(0)} (${this.describeTempo(audio.avgBpm)})\n`;
      context += `- Energy level: ${(audio.avgEnergy * 100)?.toFixed(0)}% (${this.describeEnergy(audio.avgEnergy)})\n`;
      context += `- Mood: ${(audio.avgValence * 100)?.toFixed(0)}% valence (${this.describeValence(audio.avgValence)})\n`;

      if (audio.genres && audio.genres.length > 0) {
        context += `- Genre influences: ${audio.genres.join(', ')}\n`;
      }

      if (audio.influences && audio.influences.length > 0) {
        context += `- Core influences: ${audio.influences.join(', ')}\n`;
      }

      context += `- Taste coherence: ${(audio.tasteCoherence * 100)?.toFixed(0)}% (${this.describeCoherence(audio.tasteCoherence)})\n`;
      context += '\n';
    }

    // Visual DNA
    if (visual) {
      context += `Visual Aesthetic:\n`;
      context += `- Style: ${visual.styleDescription}\n`;

      if (visual.colorPalette && visual.colorPalette.length > 0) {
        context += `- Color palette: ${visual.colorPalette.join(', ')}\n`;
      }

      if (visual.paletteCharacteristics) {
        context += `- Palette: ${visual.paletteCharacteristics}\n`;
      }

      if (visual.themes && visual.themes.length > 0) {
        context += `- Visual themes: ${visual.themes.join(', ')}\n`;
      }

      context += '\n';
    }

    // Writing Samples (Voice DNA) - Dual Layer
    if (writingSamples) {
      if (writingSamples.social) {
        context += `Public Voice (Social Posts):\n${writingSamples.social}\n\n`;
      }

      if (writingSamples.subconscious) {
        context += `Raw Voice (Stream of Consciousness):\n${writingSamples.subconscious}\n\n`;
      }

      context += `CRITICAL INSTRUCTION:\n`;
      context += `- Use vocabulary/rhythm from raw voice (authentic)\n`;
      context += `- Use structure/clarity from social posts (presentable)\n`;
      context += `- NO formal language: "sophisticated tastemaker", "discerning purveyor", "impeccable taste"\n`;
      context += `- Write like THEM, not a marketing agency\n\n`;
    }

    // WritingDNA (from Ibis — analyzed writing voice)
    if (writingDNA) {
      context += 'WRITING VOICE (from Ibis analysis — strongest voice signal):\n';
      if (writingDNA.signature) {
        context += `Voice Signature: ${writingDNA.signature}\n\n`;
      }
      if (writingDNA.patterns) {
        const p = writingDNA.patterns;
        if (p.tone?.length) context += `Tone: ${p.tone.join(', ')}\n`;
        if (p.cadence) context += `Cadence: ${p.cadence}\n`;
        if (p.syntaxSignature) context += `Syntax: ${p.syntaxSignature}\n`;
        if (p.narrativeVoice) context += `Narrative voice: ${p.narrativeVoice}\n`;
        if (p.recurringMotifs?.length) context += `Motifs: ${p.recurringMotifs.join(', ')}\n`;
        if (p.influences?.length) context += `Writing influences: ${p.influences.join(', ')}\n`;
        if (p.metaphorDensity) context += `Metaphor density: ${p.metaphorDensity}\n`;
      }
      if (writingDNA.metrics) {
        const m = writingDNA.metrics;
        context += `Metrics: ${m.avgSentenceLength?.toFixed(1) || '?'}w avg sentence, `;
        context += `${(m.typeTokenRatio * 100)?.toFixed(0) || '?'}% vocab diversity, `;
        context += `${m.totalWords || '?'} total words analyzed\n`;
      }
      context += '\n';
    }

    return context;
  }

  /**
   * Generate artist bio using aesthetic DNA
   */
  async generateArtistBio(userId, options = {}) {
    try {
      const aestheticDNA = await this.getAestheticDNA(userId);

      if (!aestheticDNA.available) {
        return {
          success: false,
          error: 'Insufficient aesthetic DNA. Upload music and/or connect Tizita.'
        };
      }

      const context = this.buildAestheticContext(aestheticDNA);
      const tone = options.tone || 'sophisticated'; // sophisticated, casual, minimal, poetic
      const length = options.length || 'medium'; // short (100w), medium (200w), long (300w)

      const prompt = this.buildBioPrompt(context, tone, length);

      const bio = await this.callLLM(prompt);

      // Save to generation history
      this.saveGenerationHistory(userId, 'artist_bio', prompt, bio);

      return {
        success: true,
        bio,
        usedAestheticDNA: {
          audioTracks: aestheticDNA.audio?.trackCount,
          visualPhotos: aestheticDNA.visual ? 'connected' : 'not connected',
          coherence: aestheticDNA.audio?.tasteCoherence
        }
      };
    } catch (error) {
      console.error('Error generating artist bio:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate social media caption
   */
  async generateCaption(userId, context = '', options = {}) {
    try {
      const aestheticDNA = await this.getAestheticDNA(userId);

      if (!aestheticDNA.available) {
        return {
          success: false,
          error: 'Insufficient aesthetic DNA. Upload music and/or connect Tizita.'
        };
      }

      const aestheticContext = this.buildAestheticContext(aestheticDNA);
      const style = options.style || 'minimal'; // minimal, poetic, technical, hype

      const prompt = `${aestheticContext}

Context: ${context}

Write a social media caption in a ${style} style that matches this artist's aesthetic.
${style === 'minimal' ? 'Keep it under 50 words. No hashtags.' : ''}
${style === 'poetic' ? 'Evocative, artistic language.' : ''}
${style === 'technical' ? 'Include production/musical details.' : ''}
${style === 'hype' ? 'Build excitement, more energetic.' : ''}

The caption should feel authentic to their proven taste, not generic AI.`;

      const caption = await this.callLLM(prompt);

      this.saveGenerationHistory(userId, 'caption', prompt, caption);

      return {
        success: true,
        caption
      };
    } catch (error) {
      console.error('Error generating caption:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate press release paragraph
   */
  async generatePressRelease(userId, eventContext = '', options = {}) {
    try {
      const aestheticDNA = await this.getAestheticDNA(userId);

      if (!aestheticDNA.available) {
        return {
          success: false,
          error: 'Insufficient aesthetic DNA. Upload music and/or connect Tizita.'
        };
      }

      const aestheticContext = this.buildAestheticContext(aestheticDNA);

      const prompt = `${aestheticContext}

Event/Release Context: ${eventContext}

Write a professional press release paragraph (150-200 words) for this artist.
- Sophisticated, tastemaker voice
- Reference their aesthetic DNA naturally
- Focus on cultural positioning, not hype
- Sound like a curator wrote it, not marketing`;

      const pressRelease = await this.callLLM(prompt);

      this.saveGenerationHistory(userId, 'press_release', prompt, pressRelease);

      return {
        success: true,
        pressRelease
      };
    } catch (error) {
      console.error('Error generating press release:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build bio generation prompt
   */
  buildBioPrompt(aestheticContext, tone, length) {
    const lengthMap = {
      short: '100 words',
      medium: '200 words',
      long: '300 words'
    };

    const toneMap = {
      sophisticated: 'Sophisticated, tastemaker voice. Cultural curator aesthetic.',
      casual: 'Conversational, authentic. Like talking to a friend.',
      minimal: 'Sparse, poetic. Every word counts.',
      poetic: 'Evocative, artistic. Paint with words.'
    };

    return `${aestheticContext}

Write an artist bio (${lengthMap[length]}) in this style: ${toneMap[tone]}

Requirements:
- Reference their proven musical taste (BPM, energy, genres, influences)
- Reference visual aesthetic if available
- Sound like THEM, not generic AI
- No clichés ("passion for music", "unique sound")
- Cultural positioning over self-promotion
- Make it feel earned, not aspirational

Write the bio now:`;
  }

  /**
   * Call LLM (Anthropic Claude or OpenAI GPT-4)
   */
  async callLLM(prompt) {
    if (this.provider === 'anthropic') {
      return await this.callClaude(prompt);
    } else {
      return await this.callOpenAI(prompt);
    }
  }

  /**
   * Call Anthropic Claude API
   */
  async callClaude(prompt) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    return response.data.content[0].text;
  }

  /**
   * Call OpenAI GPT-4 API
   */
  async callOpenAI(prompt) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at writing artist bios and content that matches their aesthetic DNA. Write in their voice, not generic AI.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1024,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Save generation to history
   */
  saveGenerationHistory(userId, type, prompt, output) {
    try {
      const db = new Database(this.dbPath);

      // Create table if not exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS ai_generations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          generation_type TEXT NOT NULL,
          prompt TEXT,
          output TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.prepare(`
        INSERT INTO ai_generations (user_id, generation_type, prompt, output)
        VALUES (?, ?, ?, ?)
      `).run(userId, type, prompt, output);

      db.close();
    } catch (error) {
      console.error('Error saving generation history:', error);
    }
  }

  // ============================================================================
  // IDENTITY NARRATIVE (Nommo — the power of the word)
  // ============================================================================

  /**
   * Ensure identity_narratives table exists
   */
  _ensureNarrativeTable() {
    const db = new Database(path.join(__dirname, '../../starforge_identity.db'));
    db.exec(`
      CREATE TABLE IF NOT EXISTS identity_narratives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        narrative_text TEXT NOT NULL,
        signals_hash TEXT,
        model_used TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_narrative_user ON identity_narratives(user_id, created_at DESC);
    `);
    db.close();
  }

  /**
   * Generate a 2-3 paragraph identity portrait from ALL signals.
   * Uses Claude Sonnet (not Haiku) for narrative quality.
   * This is the viral mechanic — people share this.
   */
  async generateIdentityNarrative(userId) {
    try {
      const aestheticDNA = await this.getAestheticDNA(userId);

      if (!aestheticDNA.available) {
        return {
          success: false,
          error: 'Insufficient identity signals. Connect at least one data source.',
        };
      }

      const context = this.buildAestheticContext(aestheticDNA);
      const signalsHash = this._computeSignalsHash(aestheticDNA);

      const prompt = `You are Nommo — the Dogon concept of the power of the word to create reality.

From these signals about a creator, write a 2-3 paragraph identity portrait. Speak their identity into existence.

Rules:
- This is NOT a personality type description. It's a mirror.
- Use their actual vocabulary and rhythm if WritingDNA is available.
- Reference their specific music genres, visual themes, project names — not abstractions.
- Name creative tensions as strengths, not contradictions.
- If their writing style is terse, be terse. If it's lush, be lush. Match them.
- Make it something they'd screenshot and share.
- NO personality jargon ("INFJ", "openness score 78%")
- NO marketing speak ("sophisticated tastemaker", "discerning purveyor")
- NO generic AI voice. Write like a perceptive friend who truly sees them.
- 150-250 words. Dense, not padded.

Example of the tone (do NOT copy, just match the quality):
"You build at the intersection of what shouldn't work together. Your sonic palette pulls from the deep sub-bass of grime but your visual taste reaches toward the clean geometry of De Stijl. This isn't contradiction — it's a controlled collision. You don't follow taste; you manufacture friction and extract meaning from the sparks."

CREATOR SIGNALS:
${context}`;

      // Use Claude Sonnet for narrative quality (upgrade from default Haiku)
      const narrativeText = await this._callClaudeSonnet(prompt);

      // Save to database
      this._ensureNarrativeTable();
      const identityDb = new Database(path.join(__dirname, '../../starforge_identity.db'));
      identityDb.prepare(`
        INSERT INTO identity_narratives (user_id, narrative_text, signals_hash, model_used)
        VALUES (?, ?, ?, ?)
      `).run(userId, narrativeText, signalsHash, 'claude-sonnet-4-5-20250929');
      identityDb.close();

      return {
        success: true,
        narrative: narrativeText,
        signalsHash,
        signalsUsed: {
          audio: !!aestheticDNA.audio,
          visual: !!aestheticDNA.visual,
          writingDNA: !!aestheticDNA.writingDNA,
          writingSamples: !!aestheticDNA.writingSamples,
          projectDNA: !!aestheticDNA.projectDNA,
          subtaste: !!aestheticDNA.subtaste,
        },
      };
    } catch (error) {
      console.error('[narrative] Error generating identity narrative:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the latest cached narrative for a user.
   */
  getLatestNarrative(userId) {
    try {
      this._ensureNarrativeTable();
      const db = new Database(path.join(__dirname, '../../starforge_identity.db'));
      const row = db.prepare(`
        SELECT * FROM identity_narratives
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(userId);
      db.close();

      if (!row) return null;

      return {
        id: row.id,
        narrative: row.narrative_text,
        signalsHash: row.signals_hash,
        model: row.model_used,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('[narrative] Error getting latest:', error.message);
      return null;
    }
  }

  /**
   * Get narrative history for drift comparison.
   */
  getNarrativeHistory(userId, limit = 10) {
    try {
      this._ensureNarrativeTable();
      const db = new Database(path.join(__dirname, '../../starforge_identity.db'));
      const rows = db.prepare(`
        SELECT * FROM identity_narratives
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(userId, limit);
      db.close();

      return rows.map(row => ({
        id: row.id,
        narrative: row.narrative_text,
        signalsHash: row.signals_hash,
        model: row.model_used,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('[narrative] Error getting history:', error.message);
      return [];
    }
  }

  /**
   * Call Claude Sonnet specifically (higher quality than Haiku for narrative generation).
   */
  async _callClaudeSonnet(prompt) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      }
    );
    return response.data.content[0].text;
  }

  /**
   * Compute a simple hash of current signals for cache invalidation.
   */
  _computeSignalsHash(aestheticDNA) {
    const parts = [
      aestheticDNA.audio?.trackCount || 0,
      aestheticDNA.audio?.tasteCoherence || 0,
      aestheticDNA.visual?.styleDescription || '',
      aestheticDNA.writingDNA?.version || 0,
      aestheticDNA.writingDNA?.wordCount || 0,
      aestheticDNA.subtaste?.primary?.designation || '',
      aestheticDNA.projectDNA?.confidence || 0,
    ];
    // Simple string hash
    const str = parts.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  }

  // Helper description methods
  describeTempo(bpm) {
    if (!bpm) return 'varied';
    if (bpm < 90) return 'downtempo/ambient';
    if (bpm < 110) return 'mid-tempo';
    if (bpm < 128) return 'house tempo';
    if (bpm < 140) return 'techno tempo';
    return 'high-energy';
  }

  describeEnergy(energy) {
    if (!energy) return 'varied';
    if (energy < 0.3) return 'contemplative, low-energy';
    if (energy < 0.5) return 'moderate, balanced';
    if (energy < 0.7) return 'energetic';
    return 'high-intensity';
  }

  describeValence(valence) {
    if (!valence) return 'varied';
    if (valence < 0.3) return 'dark, melancholic';
    if (valence < 0.5) return 'introspective';
    if (valence < 0.7) return 'positive, uplifting';
    return 'euphoric, bright';
  }

  describeCoherence(coherence) {
    if (!coherence) return 'eclectic';
    if (coherence < 0.5) return 'highly eclectic, diverse taste';
    if (coherence < 0.7) return 'moderately focused';
    return 'highly focused, coherent';
  }
}

module.exports = new AITwinService();
