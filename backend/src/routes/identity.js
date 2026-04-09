/**
 * Identity Routes
 * Endpoints for identity narratives, snapshots, drift detection, and seasons.
 *
 * POST /narrative/:userId       — generate new identity narrative
 * GET  /narrative/:userId       — get latest cached narrative
 * GET  /narrative/:userId/history — get narrative history
 */

const express = require('express');
const router = express.Router();
const aiTwinService = require('../services/aiTwinService');
const identityDriftService = require('../services/identityDriftService');
const convictionWeightService = require('../services/convictionWeightService');

// ── Narrative ──

// Generate a new identity narrative
router.post('/narrative/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await aiTwinService.generateIdentityNarrative(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[identity] narrative generation error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get latest cached narrative
router.get('/narrative/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const narrative = aiTwinService.getLatestNarrative(userId);

    if (!narrative) {
      return res.json({
        success: true,
        hasNarrative: false,
        message: 'No narrative generated yet.',
      });
    }

    // Check if signals have changed since last narrative
    const aestheticDNA = await aiTwinService.getAestheticDNA(userId);
    const currentHash = aiTwinService._computeSignalsHash(aestheticDNA);
    const isStale = narrative.signalsHash !== currentHash;

    res.json({
      success: true,
      hasNarrative: true,
      narrative: narrative.narrative,
      createdAt: narrative.createdAt,
      isStale,
    });
  } catch (error) {
    console.error('[identity] get narrative error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get narrative history
router.get('/narrative/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const history = aiTwinService.getNarrativeHistory(userId, limit);

    res.json({
      success: true,
      narratives: history,
      count: history.length,
    });
  } catch (error) {
    console.error('[identity] narrative history error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Snapshots + Drift ──

// Create a manual identity snapshot
router.post('/snapshot/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const trigger = req.body?.trigger || 'manual';

    // Gather current identity data for the snapshot
    const aestheticDNA = await aiTwinService.getAestheticDNA(userId);
    const narrative = aiTwinService.getLatestNarrative(userId);

    const identityData = {
      subtaste: aestheticDNA.subtaste,
      coherenceScore: aestheticDNA.audio?.tasteCoherence || null,
      audioHash: `${aestheticDNA.audio?.trackCount || 0}`,
      visualHash: aestheticDNA.visual?.styleDescription?.substring(0, 20) || null,
      writingHash: aestheticDNA.writingDNA ? `v${aestheticDNA.writingDNA.version}` : null,
      signalsSummary: {
        audioTracks: aestheticDNA.audio?.trackCount,
        hasVisual: !!aestheticDNA.visual,
        hasWritingDNA: !!aestheticDNA.writingDNA,
        hasProjectDNA: !!aestheticDNA.projectDNA,
        archetype: aestheticDNA.subtaste?.primary?.glyph,
      },
      narrativeText: narrative?.narrative || null,
    };

    const result = identityDriftService.createSnapshot(userId, trigger, identityData);

    res.json({
      success: true,
      snapshot: result,
    });
  } catch (error) {
    console.error('[identity] snapshot error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get identity timeline (all snapshots)
router.get('/timeline/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const timeline = identityDriftService.getTimeline(userId, limit);

    res.json({
      success: true,
      timeline,
      count: timeline.length,
    });
  } catch (error) {
    console.error('[identity] timeline error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get drift analysis
router.get('/drift/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const window = parseInt(req.query.window) || 90;
    const drift = identityDriftService.calculateDrift(userId, window);

    res.json({
      success: true,
      drift,
    });
  } catch (error) {
    console.error('[identity] drift error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current creative season
router.get('/season/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const season = identityDriftService.detectSeason(userId);

    res.json({
      success: true,
      season: season || 'unknown',
    });
  } catch (error) {
    console.error('[identity] season error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Conviction Weights ──

// Get conviction weight breakdown for a user
router.get('/conviction/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const aestheticDNA = await aiTwinService.getAestheticDNA(userId);

    const convictionWeights = convictionWeightService.getConvictionWeights({
      audioDNA: aestheticDNA.audio,
      visualDNA: aestheticDNA.visual,
      photoSignals: aestheticDNA.photoSignals || null,
      projectDNA: aestheticDNA.projectDNA,
      writingDNA: aestheticDNA.writingDNA,
    });

    res.json({
      success: true,
      ...convictionWeights,
    });
  } catch (error) {
    console.error('[identity] conviction error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get profile with conviction weights applied
router.get('/weighted-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const aestheticDNA = await aiTwinService.getAestheticDNA(userId);

    const convictionWeights = convictionWeightService.getConvictionWeights({
      audioDNA: aestheticDNA.audio,
      visualDNA: aestheticDNA.visual,
      photoSignals: aestheticDNA.photoSignals || null,
      projectDNA: aestheticDNA.projectDNA,
      writingDNA: aestheticDNA.writingDNA,
    });

    res.json({
      success: true,
      subtaste: aestheticDNA.subtaste,
      conviction: convictionWeights,
    });
  } catch (error) {
    console.error('[identity] weighted-profile error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
