const express = require('express');
const router = express.Router();
const loraService = require('../services/loraTrainingService');

/**
 * LoRA Training API Routes
 *
 * Train custom audio generation models on your Sonic DNA
 */

/**
 * GET /api/lora/models
 * List user's LoRA models
 */
router.get('/models', async (req, res) => {
  try {
    const userId = req.query.userId || 'default_user';
    const models = loraService.getLoRAModels(userId);

    res.json({
      success: true,
      models,
      count: models.length
    });
  } catch (error) {
    console.error('Failed to list LoRA models:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/lora/models/:id
 * Get a specific LoRA model
 */
router.get('/models/:id', async (req, res) => {
  try {
    const model = loraService.getLoRAModel(req.params.id);

    if (!model) {
      return res.status(404).json({ success: false, error: 'LoRA model not found' });
    }

    // Get training tracks
    const trainingTracks = loraService.getTrainingTracks(req.params.id);

    res.json({
      success: true,
      model,
      trainingTracks
    });
  } catch (error) {
    console.error('Failed to get LoRA model:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lora/curate
 * Preview training data curation without starting training
 */
router.post('/curate', async (req, res) => {
  try {
    const {
      userId = 'default_user',
      coherenceThreshold = 0.7,
      maxTracks = 100
    } = req.body;

    const curation = await loraService.curateTrainingData(userId, {
      coherenceThreshold,
      maxTracks
    });

    res.json({
      success: true,
      totalTracks: curation.totalTracks,
      curatedCount: curation.curatedTracks.length,
      rejectedCount: curation.rejectedCount,
      averageCoherence: curation.averageCoherence,
      avgProfile: curation.avgProfile,
      // Return top 10 tracks as preview
      previewTracks: curation.curatedTracks.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        coherenceScore: t.coherenceScore
      }))
    });
  } catch (error) {
    console.error('Failed to curate training data:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lora/train
 * Start LoRA training job
 */
router.post('/train', async (req, res) => {
  try {
    const {
      userId = 'default_user',
      name,
      baseModel = 'musicgen-medium',
      coherenceThreshold = 0.7,
      epochs = 100,
      learningRate = 1e-4,
      loraRank = 16,
      loraAlpha = 32
    } = req.body;

    const result = await loraService.startTraining(userId, {
      name,
      baseModel,
      coherenceThreshold,
      epochs,
      learningRate,
      loraRank,
      loraAlpha
    });

    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Failed to start LoRA training:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/lora/models/:id/status
 * Check training status
 */
router.get('/models/:id/status', async (req, res) => {
  try {
    const status = await loraService.checkTrainingStatus(req.params.id);

    res.json({
      success: true,
      loraId: req.params.id,
      ...status
    });
  } catch (error) {
    console.error('Failed to check training status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lora/models/:id/generate
 * Generate audio using a trained LoRA
 */
router.post('/models/:id/generate', async (req, res) => {
  try {
    const {
      prompt,
      duration = 30,
      loraStrength = 0.8
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const result = await loraService.generate(req.params.id, prompt, {
      duration,
      loraStrength
    });

    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Failed to generate audio:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/lora/models/:id/generations
 * Get generation history for a LoRA
 */
router.get('/models/:id/generations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const generations = loraService.getGenerations(req.params.id, limit);

    res.json({
      success: true,
      generations,
      count: generations.length
    });
  } catch (error) {
    console.error('Failed to get generations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/lora/models/:id
 * Delete a LoRA model
 */
router.delete('/models/:id', async (req, res) => {
  try {
    const userId = req.query.userId || 'default_user';
    const result = loraService.deleteLoRA(req.params.id, userId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Failed to delete LoRA:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/lora/base-models
 * List available base models for training
 */
router.get('/base-models', (req, res) => {
  res.json({
    success: true,
    models: [
      {
        id: 'musicgen-small',
        name: 'MusicGen Small',
        minTracks: 10,
        maxTracks: 100,
        trainingTime: '30-60 min',
        description: 'Fastest training, good for testing'
      },
      {
        id: 'musicgen-medium',
        name: 'MusicGen Medium',
        minTracks: 20,
        maxTracks: 200,
        trainingTime: '1-2 hours',
        description: 'Recommended for most use cases'
      },
      {
        id: 'musicgen-large',
        name: 'MusicGen Large',
        minTracks: 30,
        maxTracks: 500,
        trainingTime: '2-4 hours',
        description: 'Highest quality, requires more data'
      }
    ]
  });
});

module.exports = router;
