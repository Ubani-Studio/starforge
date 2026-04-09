/**
 * Twin OS Visual DNA Import Routes
 *
 * Receives Visual DNA exports from Tizita and integrates with Audio DNA
 * for cross-modal coherence analysis.
 */

const express = require('express');
const router = express.Router();
const crossModalAnalyzer = require('../services/crossModalAnalyzer');
const sonicPaletteService = require('../services/sonicPaletteService');
const sinkEnhanced = require('../services/sinkEnhanced');
const Database = require('better-sqlite3');
const path = require('path');
const projectDnaService = require('../services/projectDnaService');
const subtasteService = require('../services/subtasteService');
const tizitaDirectService = require('../services/tizitaServiceDirect');
const artMovementClassifier = require('../services/artMovementClassifier');
const subtasteGenomeCache = require('../services/subtasteGenomeCache');

// Audio database connection
const audioDbPath = path.join(__dirname, '../../starforge_audio.db');
let audioDB = null;

const getAudioDB = () => {
  if (!audioDB) {
    try {
      audioDB = new Database(audioDbPath);
    } catch (error) {
      console.error('Could not connect to audio database:', error.message);
      return null;
    }
  }
  return audioDB;
};

// In-memory cache for imported Visual DNA (would use Redis in production)
const visualDnaCache = new Map();

// Ecosystem API secret verification
const ECOSYSTEM_API_SECRET = process.env.ECOSYSTEM_API_SECRET || 'dev-secret-change-in-production';

const verifyEcosystemSecret = (req, res, next) => {
  const secret = req.headers['x-ecosystem-secret'];
  const isDev = process.env.NODE_ENV !== 'production';

  if (secret === ECOSYSTEM_API_SECRET || isDev) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid ecosystem secret'
  });
};

/**
 * POST /api/twin/visual-dna/import
 * Import Visual DNA from Tizita and calculate cross-modal coherence
 */
router.post('/import', verifyEcosystemSecret, async (req, res) => {
  try {
    const {
      user_id,
      taste_vector,
      confidence,
      stats,
      visual_characteristics,
      source = 'tizita'
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    // Store the imported Visual DNA
    const importedDna = {
      user_id,
      taste_vector,
      confidence,
      stats,
      visual_characteristics,
      source,
      imported_at: new Date().toISOString()
    };

    visualDnaCache.set(user_id, importedDna);

    // Get Audio DNA for cross-modal analysis
    let audioDna = null;
    let crossModalResult = null;

    const db = getAudioDB();
    if (db) {
      try {
        const tracks = db.prepare(`
          SELECT * FROM audio_tracks
          ORDER BY quality_score DESC, uploaded_at DESC
          LIMIT 100
        `).all();

        if (tracks.length > 0) {
          // Calculate sonic palette
          const sonicPalette = await sonicPaletteService.extractSonicPalette(
            user_id,
            tracks,
            false
          );

          // Calculate taste coherence
          const tasteCoherence = sinkEnhanced.calculateTasteCoherence(tracks);

          // Build Audio DNA summary
          audioDna = {
            trackCount: tracks.length,
            avgEnergy: tracks.reduce((sum, t) => sum + (t.energy || 0.5), 0) / tracks.length,
            avgBpm: tracks.reduce((sum, t) => sum + (t.bpm || 120), 0) / tracks.length,
            tonalCharacteristics: sonicPalette.tonalCharacteristics,
            dominantFrequencies: sonicPalette.dominantFrequencies,
            tasteCoherence
          };

          // Calculate cross-modal coherence
          const visualForAnalysis = {
            colorPalette: visual_characteristics?.dominant_colors || [],
            warmth: visual_characteristics?.warmth || 0.5,
            energy: visual_characteristics?.energy || 0.5,
            themes: visual_characteristics?.themes || [],
            confidence
          };

          crossModalResult = crossModalAnalyzer.analyzeCrossModalCoherence(
            visualForAnalysis,
            audioDna
          );
        }
      } catch (dbError) {
        console.error('Error getting audio data:', dbError.message);
      }
    }

    // Build response
    const response = {
      success: true,
      imported: {
        user_id,
        source,
        confidence,
        stats
      }
    };

    if (crossModalResult) {
      response.cross_modal_analysis = {
        coherence_score: crossModalResult.overallCoherence || crossModalResult.score || 0.5,
        alignment: {
          warmth: {
            visual: visual_characteristics?.warmth || 0.5,
            audio: audioDna?.tonalCharacteristics?.warmth || 0.5,
            delta: Math.abs(
              (visual_characteristics?.warmth || 0.5) -
              (audioDna?.tonalCharacteristics?.warmth || 0.5)
            ),
            aligned: Math.abs(
              (visual_characteristics?.warmth || 0.5) -
              (audioDna?.tonalCharacteristics?.warmth || 0.5)
            ) < 0.2
          },
          energy: {
            visual: visual_characteristics?.energy || 0.5,
            audio: audioDna?.avgEnergy || 0.5,
            delta: Math.abs(
              (visual_characteristics?.energy || 0.5) -
              (audioDna?.avgEnergy || 0.5)
            ),
            aligned: Math.abs(
              (visual_characteristics?.energy || 0.5) -
              (audioDna?.avgEnergy || 0.5)
            ) < 0.2
          }
        },
        recommendation: generateRecommendation(
          visual_characteristics,
          audioDna
        )
      };
    } else {
      response.cross_modal_analysis = null;
      response.message = 'No audio data available for cross-modal analysis. Upload tracks to Starforge first.';
    }

    res.json(response);
  } catch (error) {
    console.error('Error importing Visual DNA:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/twin/visual-dna/status/:userId
 * Get the current Visual DNA status for a user
 */
router.get('/status/:userId', (req, res) => {
  const { userId } = req.params;
  const cached = visualDnaCache.get(userId);

  if (cached) {
    res.json({
      success: true,
      has_visual_dna: true,
      imported_at: cached.imported_at,
      confidence: cached.confidence,
      source: cached.source
    });
  } else {
    res.json({
      success: true,
      has_visual_dna: false,
      message: 'No Visual DNA imported. Sync from Tizita to enable cross-modal analysis.'
    });
  }
});

/**
 * GET /api/twin/context/:userId
 * Get full Twin OS context for use by Slayt and other apps
 */
router.get('/context/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get cached Visual DNA
    const visualDna = visualDnaCache.get(userId);

    // Fetch deep analysis from Tizita API (art movements, influences, composition)
    let deepAnalysis = null;
    try {
      const fullResponse = await tizitaDirectService.fetchDeepAnalysis(1);
      // Extract the nested deep_analysis object (fetchDeepAnalysis returns full response)
      deepAnalysis = fullResponse?.deep_analysis || fullResponse;
    } catch (err) {
      // Tizita not running — that's fine
    }

    // Get Audio DNA
    let audioDna = null;
    const db = getAudioDB();

    if (db) {
      try {
        const tracks = db.prepare(`
          SELECT * FROM audio_tracks
          ORDER BY quality_score DESC, uploaded_at DESC
          LIMIT 100
        `).all();

        if (tracks.length > 0) {
          const sonicPalette = await sonicPaletteService.extractSonicPalette(
            userId,
            tracks,
            false
          );
          const tasteCoherence = sinkEnhanced.calculateTasteCoherence(tracks);

          audioDna = {
            sonic_palette: sonicPalette.dominantFrequencies,
            taste_coherence: tasteCoherence.overall,
            primary_genre: sonicPalette.primaryGenre || 'electronic',
            track_count: tracks.length
          };
        }
      } catch (dbError) {
        console.error('Error getting audio context:', dbError.message);
      }
    }

    // Calculate cross-modal coherence if both available
    let crossModalCoherence = null;
    if (visualDna && audioDna) {
      crossModalCoherence = calculateSimpleCoherence(
        visualDna.visual_characteristics,
        audioDna
      );
    }

    // Get Project DNA (highest-conviction identity signal — auto-scans once if not cached)
    const projectDna = await projectDnaService.getOrScanProjectDNA(userId === 'default_user' ? 'default' : userId);

    // Prefer cached quiz genome (actual Subtaste quiz results), fall back to local classification
    const cachedGenome = subtasteGenomeCache.getCache(userId === 'default_user' ? 'default_user' : userId);
    let subtasteResult = null;

    if (cachedGenome && cachedGenome.primary?.designation) {
      // Use real quiz data from cache — reconstruct archetype shape from genome JSON
      const genome = cachedGenome.genome || {};
      const archetype = genome.archetype || {};
      subtasteResult = {
        classification: {
          primary: archetype.primary || cachedGenome.primary,
          secondary: archetype.secondary || cachedGenome.secondary || null,
          tertiary: archetype.tertiary || null,
          distribution: archetype.distribution || cachedGenome.distribution || null,
        },
        psychometrics: cachedGenome.psychometrics || genome.psychometrics || null,
        source: cachedGenome.source || 'cache',
        signalCount: cachedGenome.signalCount || 0,
        stagesCompleted: cachedGenome.stagesCompleted || [],
      };
    } else {
      // Fall back to local classification from available signals
      const visualChars = visualDna?.visual_characteristics || null;
      const localResult = subtasteService.classifyUser({
        audioDNA: audioDna,
        visualDNA: visualChars ? {
          warmth: visualChars.warmth,
          energy: visualChars.energy,
          themes: visualChars.themes,
        } : null,
        projectDNA: projectDna,
      });
      if (localResult) {
        subtasteResult = {
          classification: localResult.classification,
          psychometrics: localResult.psychometrics,
          source: 'auto',
        };
      }
    }

    // Build Twin OS context
    const context = {
      user_id: userId,
      twin_os: {
        audio_dna: audioDna || {
          message: 'No audio data. Upload tracks to analyze.'
        },
        visual_dna: visualDna || deepAnalysis ? {
          dominant_colors: visualDna?.visual_characteristics?.dominant_colors || [],
          warmth: visualDna?.visual_characteristics?.warmth || 0.5,
          energy: visualDna?.visual_characteristics?.energy || 0.5,
          themes: visualDna?.visual_characteristics?.themes || [],
          confidence: visualDna?.confidence || 0,
          // Art movements: prefer photo-signal classification, fall back to heuristic
          art_movements: (() => {
            const pm = artMovementClassifier.classifyMovements();
            return pm ? pm.movements : (deepAnalysis?.art_movements || deepAnalysis?.artMovements || []);
          })(),
          influences: deepAnalysis?.influences || [],
          color_profile: deepAnalysis?.color_profile || deepAnalysis?.colorProfile || null,
          composition: deepAnalysis?.composition || null,
          visual_era: deepAnalysis?.visual_era || deepAnalysis?.visualEra || null,
        } : {
          message: 'No Visual DNA. Sync from Tizita.'
        },
        cross_modal_coherence: crossModalCoherence,
        archetype: deriveArchetype(visualDna, audioDna),
        brand_keywords: deriveBrandKeywords(visualDna, audioDna)
      },
      project_dna: projectDna || null,
      subtaste: subtasteResult ? {
        archetype: subtasteResult.classification,
        psychometrics: subtasteResult.psychometrics || null,
        source: subtasteResult.source || 'auto',
        signalCount: subtasteResult.signalCount || 0,
        stagesCompleted: subtasteResult.stagesCompleted || [],
      } : null,
      content_guidance: {
        visual_direction: deriveVisualDirection(visualDna, deepAnalysis),
        caption_voice: projectDna?.tone?.register || 'Understated, culturally literate',
        avoid: projectDna?.coreIdentity?.antiTaste || ['excessive emojis', 'hype language'],
        preserve_terms: projectDna?.tone?.preserveTerms || [],
      },
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      ...context
    });
  } catch (error) {
    console.error('Error getting Twin context:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/twin/visual-dna/connect-tizita
 * Frontend calls this when "Connect Tizita" is clicked
 * Fetches analysis from Tizita API and stores in local cache
 * No ecosystem secret needed (frontend → own backend)
 */
router.post('/connect-tizita', async (req, res) => {
  try {
    const { user_id = 'default_user' } = req.body;

    // Fetch deep analysis from Tizita
    const deepAnalysis = await tizitaDirectService.fetchDeepAnalysis(1);

    if (!deepAnalysis) {
      return res.status(503).json({
        success: false,
        error: 'Tizita not reachable. Start Tizita on port 8001.',
      });
    }

    // Extract base characteristics from the analysis response
    const baseChars = deepAnalysis.base_characteristics || {};
    const deep = deepAnalysis.deep_analysis || deepAnalysis;

    // Build visual_characteristics from Tizita's actual data
    const visual_characteristics = {
      warmth: baseChars.warmth || 0.5,
      energy: baseChars.energy || 0.11,
      contrast: baseChars.contrast || 0.26,
      themes: baseChars.themes || ['minimal'],
      dominant_colors: [],
    };

    // Store in the cache so context endpoint picks it up
    visualDnaCache.set(user_id, {
      user_id,
      confidence: deepAnalysis.confidence || 0.99,
      visual_characteristics,
      deep_analysis: deep,
      source: 'tizita-connect',
      imported_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Visual DNA connected from Tizita',
      visual_characteristics,
      deep_analysis: {
        art_movements: deep.art_movements || [],
        influences: deep.influences || [],
        color_profile: deep.color_profile || {},
        composition: deep.composition || {},
        visual_era: deep.visual_era || {},
      },
    });
  } catch (error) {
    console.error('Error connecting Tizita:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/twin/visual-dna/sync
 * Pull Visual DNA directly from Tizita API
 */
router.post('/sync', verifyEcosystemSecret, async (req, res) => {
  try {
    const { user_id = 'default', tizita_url } = req.body;

    const tizitaApiUrl = tizita_url || process.env.Tizita_API_URL || 'http://localhost:8001/api/v1';

    // Fetch from Tizita
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${tizitaApiUrl}/visual-dna/export?user_id=${user_id}`, {
      method: 'GET',
      headers: {
        'X-Ecosystem-Secret': ECOSYSTEM_API_SECRET,
        'X-Source-App': 'starforge'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Tizita API error: ${error}`
      });
    }

    const visualDna = await response.json();

    // Store it
    visualDnaCache.set(user_id, {
      ...visualDna,
      source: 'tizita-sync',
      synced_at: new Date().toISOString()
    });

    // Now do cross-modal analysis
    // (reuse the import logic)
    const importReq = {
      body: visualDna,
      headers: req.headers
    };

    // Get Audio DNA and calculate coherence
    let crossModalResult = null;
    const db = getAudioDB();

    if (db) {
      try {
        const tracks = db.prepare(`
          SELECT * FROM audio_tracks LIMIT 100
        `).all();

        if (tracks.length > 0) {
          const audioDna = {
            avgEnergy: tracks.reduce((sum, t) => sum + (t.energy || 0.5), 0) / tracks.length,
            warmth: 0.5 // Would come from sonic palette
          };

          crossModalResult = {
            coherence_score: calculateSimpleCoherence(
              visualDna.visual_characteristics,
              audioDna
            )
          };
        }
      } catch (dbError) {
        console.error('DB error during sync:', dbError.message);
      }
    }

    res.json({
      success: true,
      message: 'Visual DNA synced from Tizita',
      visual_dna: {
        confidence: visualDna.confidence,
        stats: visualDna.stats
      },
      cross_modal_analysis: crossModalResult
    });
  } catch (error) {
    console.error('Error syncing from Tizita:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions

function generateRecommendation(visual, audio) {
  if (!visual || !audio) {
    return 'Insufficient data for recommendations.';
  }

  const warmthDelta = Math.abs((visual.warmth || 0.5) - (audio?.tonalCharacteristics?.warmth || 0.5));
  const energyDelta = Math.abs((visual.energy || 0.5) - (audio?.avgEnergy || 0.5));

  if (warmthDelta < 0.15 && energyDelta < 0.15) {
    return 'Your visual and audio aesthetics are well-aligned. Maintain this coherence across content.';
  }

  const recommendations = [];

  if (warmthDelta > 0.2) {
    if ((visual.warmth || 0.5) > (audio?.tonalCharacteristics?.warmth || 0.5)) {
      recommendations.push('Your visuals are warmer than your sound. Consider cooler color palettes or warmer sonic elements.');
    } else {
      recommendations.push('Your sound is warmer than your visuals. Consider warmer color tones in photos.');
    }
  }

  if (energyDelta > 0.2) {
    if ((visual.energy || 0.5) > (audio?.avgEnergy || 0.5)) {
      recommendations.push('Your visuals are more dynamic than your sound. Consider higher-energy tracks or more minimal visuals.');
    } else {
      recommendations.push('Your sound is more energetic than your visuals. Consider more dynamic, high-contrast imagery.');
    }
  }

  return recommendations.join(' ') || 'Minor adjustments could improve cross-modal coherence.';
}

function calculateSimpleCoherence(visual, audio) {
  if (!visual || !audio) return null;

  const warmthScore = 1 - Math.abs((visual.warmth || 0.5) - (audio.warmth || audio.avgEnergy || 0.5));
  const energyScore = 1 - Math.abs((visual.energy || 0.5) - (audio.avgEnergy || 0.5));

  return parseFloat(((warmthScore + energyScore) / 2).toFixed(2));
}

function deriveArchetype(visual, audio) {
  if (!visual && !audio) return 'Unknown';

  const energy = visual?.visual_characteristics?.energy || audio?.avgEnergy || 0.5;
  const warmth = visual?.visual_characteristics?.warmth || 0.5;

  if (energy > 0.7) {
    return warmth > 0.5 ? 'The Performer' : 'The Producer';
  } else if (energy < 0.3) {
    return warmth > 0.5 ? 'The Curator' : 'The Observer';
  }
  return 'The Creator';
}

function deriveBrandKeywords(visual, audio) {
  const keywords = [];

  if (visual?.visual_characteristics?.themes) {
    keywords.push(...visual.visual_characteristics.themes);
  }

  if (audio?.primary_genre) {
    keywords.push(audio.primary_genre);
  }

  if (visual?.visual_characteristics?.energy > 0.6) {
    keywords.push('dynamic');
  } else if (visual?.visual_characteristics?.energy < 0.4) {
    keywords.push('minimal');
  }

  return keywords.length > 0 ? keywords : ['creative', 'authentic'];
}

function deriveVisualDirection(visual, deepAnalysis) {
  if (!visual?.visual_characteristics && !deepAnalysis) {
    return 'Develop a consistent visual identity through Tizita.';
  }

  const parts = [];

  // Use deep analysis art movements if available (much more specific)
  const movements = deepAnalysis?.art_movements || deepAnalysis?.artMovements || [];
  if (movements.length > 0) {
    const topMovements = movements.slice(0, 3).map(m => m.name);
    parts.push(topMovements.join(' + '));
  }

  // Use deep analysis influences if available
  const influences = deepAnalysis?.influences || [];
  if (influences.length > 0) {
    parts.push(`influenced by ${influences.slice(0, 3).join(', ')}`);
  }

  // Fall back to basic warmth/energy if no deep analysis
  if (parts.length === 0 && visual?.visual_characteristics) {
    const { warmth, energy, contrast } = visual.visual_characteristics;
    if (warmth > 0.6) parts.push('Warm, inviting tones');
    else if (warmth < 0.4) parts.push('Cool, moody tones');
    if (energy > 0.6) parts.push('dynamic compositions');
    else if (energy < 0.4) parts.push('minimalist compositions');
    if (contrast > 0.6) parts.push('high contrast');
  }

  return parts.join(' — ') || 'Balanced aesthetic';
}

module.exports = router;
