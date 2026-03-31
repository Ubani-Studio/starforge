const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * LoRA Training Service
 * Trains custom audio generation models on user's Sonic DNA
 *
 * Uses Replicate/Modal for compute, but adds:
 * - DNA-based catalog curation (only train on coherent tracks)
 * - Identity linkage (LoRA = verified Sonic Identity)
 * - Provenance chain (every output traceable to identity)
 */
class LoRATrainingService {
  constructor() {
    this.dbPath = path.join(__dirname, '../../starforge_audio.db');
    this.db = null;
    this.replicateApiKey = process.env.REPLICATE_API_KEY;
    this.replicateBaseUrl = 'https://api.replicate.com/v1';

    // Supported base models for LoRA
    this.baseModels = {
      'musicgen-small': {
        version: 'b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38',
        minTracks: 10,
        maxTracks: 100,
        trainingTime: '30-60 min'
      },
      'musicgen-medium': {
        version: '7a76a8258b23fae65c5a22debb8841d1d7e816b75c2f24218cd2bd8573787906',
        minTracks: 20,
        maxTracks: 200,
        trainingTime: '1-2 hours'
      },
      'musicgen-large': {
        version: '7a76a8258b23fae65c5a22debb8841d1d7e816b75c2f24218cd2bd8573787906',
        minTracks: 30,
        maxTracks: 500,
        trainingTime: '2-4 hours'
      }
    };
  }

  getDb() {
    if (!this.db) {
      this.db = new Database(this.dbPath);
      this.initTables();
    }
    return this.db;
  }

  /**
   * Initialize LoRA-related tables
   */
  initTables() {
    const db = this.getDb();

    db.exec(`
      CREATE TABLE IF NOT EXISTS lora_models (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        base_model TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        replicate_training_id TEXT,
        weights_url TEXT,
        training_started_at TEXT,
        training_completed_at TEXT,
        track_count INTEGER,
        coherence_threshold REAL,
        training_config TEXT,
        metrics TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      );

      CREATE TABLE IF NOT EXISTS lora_training_tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lora_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        coherence_score REAL,
        included BOOLEAN DEFAULT 1,
        FOREIGN KEY (lora_id) REFERENCES lora_models(id)
      );

      CREATE TABLE IF NOT EXISTS lora_generations (
        id TEXT PRIMARY KEY,
        lora_id TEXT NOT NULL,
        prompt TEXT,
        audio_url TEXT,
        provenance_cid TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lora_id) REFERENCES lora_models(id)
      );

      CREATE INDEX IF NOT EXISTS idx_lora_user ON lora_models(user_id);
      CREATE INDEX IF NOT EXISTS idx_lora_status ON lora_models(status);
    `);
  }

  /**
   * Get user's LoRA models
   */
  getLoRAModels(userId) {
    const db = this.getDb();
    return db.prepare(`
      SELECT * FROM lora_models
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
  }

  /**
   * Get a specific LoRA model
   */
  getLoRAModel(loraId) {
    const db = this.getDb();
    const model = db.prepare('SELECT * FROM lora_models WHERE id = ?').get(loraId);
    if (model && model.training_config) {
      model.training_config = JSON.parse(model.training_config);
    }
    if (model && model.metrics) {
      model.metrics = JSON.parse(model.metrics);
    }
    return model;
  }

  /**
   * Curate training tracks based on Sonic DNA coherence
   * Only includes tracks that match the user's core sonic identity
   */
  async curateTrainingData(userId, options = {}) {
    const {
      coherenceThreshold = 0.7,
      maxTracks = 100,
      preferOriginals = true
    } = options;

    const db = this.getDb();

    // Get all user tracks with their audio features
    // Note: Using Starforge's actual schema (filename-based, with Spotify enrichment)
    let query = `
      SELECT
        id, filename, file_path,
        bpm, effective_bpm, key,
        energy, COALESCE(spotify_energy, energy) as energy_combined,
        COALESCE(spotify_danceability, 0.5) as danceability,
        COALESCE(spotify_valence, valence, 0.5) as valence_combined,
        duration_seconds, genre,
        source, musical_context,
        is_halftime
      FROM audio_tracks
      WHERE user_id = ?
    `;
    const params = [userId];

    // Prefer original uploads over DJ library imports
    if (preferOriginals) {
      query += ` ORDER BY
        CASE WHEN source = 'upload' THEN 0 ELSE 1 END,
        uploaded_at DESC
      `;
    }

    const allTracks = db.prepare(query).all(...params);

    if (allTracks.length < 10) {
      throw new Error(`Need at least 10 tracks for LoRA training, found ${allTracks.length}`);
    }

    // Calculate average profile (the user's "center")
    const avgProfile = this.calculateAverageProfile(allTracks);

    // Parse filenames to get artist/title and score by coherence
    const scoredTracks = allTracks.map(track => {
      const parsed = this.parseFilename(track.filename);
      return {
        ...track,
        artist: parsed.artist,
        title: parsed.title,
        filepath: track.file_path,
        coherenceScore: this.calculateCoherence(track, avgProfile)
      };
    });

    // Filter by coherence threshold and limit
    const curatedTracks = scoredTracks
      .filter(t => t.coherenceScore >= coherenceThreshold)
      .sort((a, b) => b.coherenceScore - a.coherenceScore)
      .slice(0, maxTracks);

    return {
      totalTracks: allTracks.length,
      curatedTracks: curatedTracks,
      averageCoherence: curatedTracks.reduce((sum, t) => sum + t.coherenceScore, 0) / curatedTracks.length,
      rejectedCount: allTracks.length - curatedTracks.length,
      avgProfile
    };
  }

  /**
   * Parse artist and title from filename
   * Common formats: "Artist - Title.mp3", "Artist_-_Title.mp3", etc.
   */
  parseFilename(filename) {
    // Remove extension
    const name = filename.replace(/\.[^/.]+$/, '');

    // Try common separators
    const separators = [' - ', ' – ', '_-_', ' _ '];
    for (const sep of separators) {
      if (name.includes(sep)) {
        const [artist, title] = name.split(sep, 2);
        return { artist: artist.trim(), title: title?.trim() || name };
      }
    }

    // No separator found - use filename as title
    return { artist: 'Unknown', title: name };
  }

  /**
   * Calculate average audio profile from tracks
   */
  calculateAverageProfile(tracks) {
    const features = ['energy_combined', 'danceability', 'valence_combined'];
    const profile = {};

    for (const feature of features) {
      // Try the combined feature first, then fallback to base feature
      const values = tracks
        .map(t => t[feature] ?? t[feature.replace('_combined', '')])
        .filter(v => v != null);
      profile[feature] = values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0.5;
    }

    // Also store as simple names for display
    profile.energy = profile.energy_combined;
    profile.valence = profile.valence_combined;

    // BPM - use effective_bpm (half-time corrected) or regular bpm
    // Use median to avoid outlier skew
    const bpms = tracks
      .map(t => t.effective_bpm || t.bpm)
      .filter(v => v != null)
      .sort((a, b) => a - b);
    profile.bpm = bpms.length > 0 ? bpms[Math.floor(bpms.length / 2)] : 120;

    return profile;
  }

  /**
   * Calculate coherence score between a track and the average profile
   */
  calculateCoherence(track, avgProfile) {
    const features = ['energy_combined', 'danceability', 'valence_combined'];
    let totalDiff = 0;
    let count = 0;

    for (const feature of features) {
      const trackVal = track[feature] ?? track[feature.replace('_combined', '')];
      const avgVal = avgProfile[feature] ?? avgProfile[feature.replace('_combined', '')];
      if (trackVal != null && avgVal != null) {
        totalDiff += Math.abs(trackVal - avgVal);
        count++;
      }
    }

    // BPM coherence (normalized, ±30 BPM is acceptable)
    // Use effective_bpm if available (accounts for half-time detection)
    const trackBpm = track.effective_bpm || track.bpm;
    if (trackBpm != null && avgProfile.bpm != null) {
      const bpmDiff = Math.abs(trackBpm - avgProfile.bpm) / 30;
      totalDiff += Math.min(bpmDiff, 1);
      count++;
    }

    // Convert average difference to coherence score (0-1)
    const avgDiff = count > 0 ? totalDiff / count : 0.5;
    return Math.max(0, 1 - avgDiff);
  }

  /**
   * Start LoRA training job
   */
  async startTraining(userId, options = {}) {
    const {
      name = `sonic-identity-${Date.now()}`,
      baseModel = 'musicgen-medium',
      coherenceThreshold = 0.7,
      epochs = 100,
      learningRate = 1e-4,
      loraRank = 16,
      loraAlpha = 32
    } = options;

    if (!this.replicateApiKey) {
      throw new Error('REPLICATE_API_KEY not configured');
    }

    const modelConfig = this.baseModels[baseModel];
    if (!modelConfig) {
      throw new Error(`Unknown base model: ${baseModel}`);
    }

    // Curate training data
    const curation = await this.curateTrainingData(userId, {
      coherenceThreshold,
      maxTracks: modelConfig.maxTracks
    });

    if (curation.curatedTracks.length < modelConfig.minTracks) {
      throw new Error(
        `Need at least ${modelConfig.minTracks} tracks above ${coherenceThreshold} coherence. ` +
        `Found ${curation.curatedTracks.length}. Try lowering the coherence threshold.`
      );
    }

    // Generate LoRA ID
    const loraId = `lora_${crypto.randomBytes(8).toString('hex')}`;

    // Create training job record
    const db = this.getDb();
    const trainingConfig = {
      baseModel,
      epochs,
      learningRate,
      loraRank,
      loraAlpha,
      coherenceThreshold,
      avgProfile: curation.avgProfile
    };

    db.prepare(`
      INSERT INTO lora_models (id, user_id, name, base_model, status, track_count, coherence_threshold, training_config, training_started_at)
      VALUES (?, ?, ?, ?, 'preparing', ?, ?, ?, ?)
    `).run(
      loraId,
      userId,
      name,
      baseModel,
      curation.curatedTracks.length,
      coherenceThreshold,
      JSON.stringify(trainingConfig),
      new Date().toISOString()
    );

    // Record which tracks are included
    const insertTrack = db.prepare(`
      INSERT INTO lora_training_tracks (lora_id, track_id, coherence_score, included)
      VALUES (?, ?, ?, 1)
    `);

    for (const track of curation.curatedTracks) {
      insertTrack.run(loraId, track.id, track.coherenceScore);
    }

    // Prepare training data for Replicate
    // Note: In production, you'd upload audio files to a cloud storage
    // and pass URLs to Replicate. For now, we'll simulate this step.
    const trainingDataUrls = await this.prepareTrainingData(curation.curatedTracks);

    // Start Replicate training
    try {
      const training = await this.createReplicateTraining({
        loraId,
        baseModel: modelConfig.version,
        trainingData: trainingDataUrls,
        epochs,
        learningRate,
        loraRank,
        loraAlpha
      });

      // Update with Replicate training ID
      db.prepare(`
        UPDATE lora_models
        SET status = 'training', replicate_training_id = ?
        WHERE id = ?
      `).run(training.id, loraId);

      return {
        loraId,
        name,
        status: 'training',
        replicateTrainingId: training.id,
        trackCount: curation.curatedTracks.length,
        averageCoherence: curation.averageCoherence,
        estimatedTime: modelConfig.trainingTime
      };
    } catch (error) {
      // Mark as failed
      db.prepare(`
        UPDATE lora_models SET status = 'failed' WHERE id = ?
      `).run(loraId);
      throw error;
    }
  }

  /**
   * Prepare training data URLs
   * In production, upload audio to cloud storage
   */
  async prepareTrainingData(tracks) {
    // For MVP, we'll need tracks to be accessible via URL
    // This could be:
    // 1. Local file server
    // 2. S3/GCS upload
    // 3. Existing URLs if tracks are from streaming

    const urls = [];
    for (const track of tracks) {
      if (track.audio_url) {
        urls.push({
          url: track.audio_url,
          caption: `${track.artist} - ${track.title}`.slice(0, 100)
        });
      } else if (track.filepath && fs.existsSync(track.filepath)) {
        // In production: upload to S3 and get URL
        // For now: mark as needing upload
        urls.push({
          localPath: track.filepath,
          caption: `${track.artist} - ${track.title}`.slice(0, 100),
          needsUpload: true
        });
      }
    }
    return urls;
  }

  /**
   * Create training job on Replicate
   */
  async createReplicateTraining(params) {
    const {
      loraId,
      baseModel,
      trainingData,
      epochs,
      learningRate,
      loraRank,
      loraAlpha
    } = params;

    // Filter to only URLs (skip local files for now)
    const validUrls = trainingData.filter(t => t.url && !t.needsUpload);

    if (validUrls.length < 10) {
      throw new Error(
        `Need at least 10 tracks with accessible URLs. ` +
        `Found ${validUrls.length}. Upload tracks to cloud storage first.`
      );
    }

    const response = await fetch(`${this.replicateBaseUrl}/trainings`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.replicateApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Note: This is a simplified example
        // Actual Replicate training API may differ
        version: baseModel,
        input: {
          train_data: validUrls.map(t => t.url),
          captions: validUrls.map(t => t.caption),
          num_train_epochs: epochs,
          learning_rate: learningRate,
          lora_r: loraRank,
          lora_alpha: loraAlpha
        },
        destination: `starforge/${loraId}`,
        webhook: process.env.REPLICATE_WEBHOOK_URL
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Replicate training failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Check training status
   */
  async checkTrainingStatus(loraId) {
    const db = this.getDb();
    const model = this.getLoRAModel(loraId);

    if (!model) {
      throw new Error(`LoRA model not found: ${loraId}`);
    }

    if (!model.replicate_training_id) {
      return { status: model.status };
    }

    // Check Replicate status
    const response = await fetch(
      `${this.replicateBaseUrl}/trainings/${model.replicate_training_id}`,
      {
        headers: {
          'Authorization': `Token ${this.replicateApiKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check training status');
    }

    const training = await response.json();

    // Update local status
    if (training.status === 'succeeded') {
      db.prepare(`
        UPDATE lora_models
        SET status = 'ready',
            weights_url = ?,
            training_completed_at = ?,
            metrics = ?
        WHERE id = ?
      `).run(
        training.output?.weights || training.output,
        new Date().toISOString(),
        JSON.stringify(training.metrics || {}),
        loraId
      );
    } else if (training.status === 'failed') {
      db.prepare(`
        UPDATE lora_models SET status = 'failed' WHERE id = ?
      `).run(loraId);
    }

    return {
      status: training.status,
      progress: training.logs?.split('\n').slice(-5).join('\n'),
      metrics: training.metrics,
      weightsUrl: training.output?.weights || training.output
    };
  }

  /**
   * Generate audio using a trained LoRA
   */
  async generate(loraId, prompt, options = {}) {
    const model = this.getLoRAModel(loraId);

    if (!model) {
      throw new Error(`LoRA model not found: ${loraId}`);
    }

    if (model.status !== 'ready') {
      throw new Error(`LoRA model not ready. Status: ${model.status}`);
    }

    const {
      duration = 30,
      loraStrength = 0.8
    } = options;

    const response = await fetch(`${this.replicateBaseUrl}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.replicateApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: this.baseModels[model.base_model].version,
        input: {
          prompt,
          duration,
          lora_weights: model.weights_url,
          lora_scale: loraStrength
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Generation failed: ${error}`);
    }

    const prediction = await response.json();

    // Poll for completion
    const result = await this.waitForPrediction(prediction.id);

    // Record generation
    const generationId = `gen_${crypto.randomBytes(8).toString('hex')}`;
    const db = this.getDb();
    db.prepare(`
      INSERT INTO lora_generations (id, lora_id, prompt, audio_url, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      generationId,
      loraId,
      prompt,
      result.output,
      new Date().toISOString()
    );

    return {
      generationId,
      loraId,
      prompt,
      audioUrl: result.output,
      duration
    };
  }

  /**
   * Wait for Replicate prediction to complete
   */
  async waitForPrediction(predictionId, maxWaitMs = 300000) {
    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      const response = await fetch(
        `${this.replicateBaseUrl}/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${this.replicateApiKey}`
          }
        }
      );

      const prediction = await response.json();

      if (prediction.status === 'succeeded') {
        return prediction;
      } else if (prediction.status === 'failed') {
        throw new Error(`Prediction failed: ${prediction.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Prediction timed out');
  }

  /**
   * Delete a LoRA model
   */
  deleteLoRA(loraId, userId) {
    const db = this.getDb();

    // Verify ownership
    const model = db.prepare('SELECT * FROM lora_models WHERE id = ? AND user_id = ?').get(loraId, userId);
    if (!model) {
      throw new Error('LoRA model not found or not owned by user');
    }

    // Delete related records
    db.prepare('DELETE FROM lora_training_tracks WHERE lora_id = ?').run(loraId);
    db.prepare('DELETE FROM lora_generations WHERE lora_id = ?').run(loraId);
    db.prepare('DELETE FROM lora_models WHERE id = ?').run(loraId);

    return { deleted: true, loraId };
  }

  /**
   * Get generation history for a LoRA
   */
  getGenerations(loraId, limit = 50) {
    const db = this.getDb();
    return db.prepare(`
      SELECT * FROM lora_generations
      WHERE lora_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(loraId, limit);
  }

  /**
   * Get training tracks for a LoRA
   */
  getTrainingTracks(loraId) {
    const db = this.getDb();
    return db.prepare(`
      SELECT lt.*, at.title, at.artist, at.genre
      FROM lora_training_tracks lt
      JOIN audio_tracks at ON lt.track_id = at.id
      WHERE lt.lora_id = ?
      ORDER BY lt.coherence_score DESC
    `).all(loraId);
  }
}

module.exports = new LoRATrainingService();
module.exports.LoRATrainingService = LoRATrainingService;
