/**
 * WritingDNA Routes
 * Endpoints for fetching/syncing WritingDNA from Ibis (Vaulted Ink).
 *
 * GET  /ibis/:userId       — return cached WritingDNA (auto-refetch if stale)
 * POST /ibis/:userId/sync  — force re-fetch from Ibis
 */

const express = require('express');
const router = express.Router();
const ibisService = require('../services/ibisService');

// Get cached WritingDNA (auto-fetches if no cache or stale)
router.get('/ibis/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await ibisService.getCached(userId);

    if (!data) {
      return res.json({
        success: true,
        connected: false,
        message: 'No WritingDNA available. Ensure Ibis is running and has analyzed documents.',
      });
    }

    res.json({
      success: true,
      connected: true,
      writingDNA: data,
    });
  } catch (error) {
    console.error('[writing-dna] GET error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Force re-fetch from Ibis
router.post('/ibis/:userId/sync', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await ibisService.sync(userId);

    if (!data) {
      return res.json({
        success: false,
        error: 'Failed to sync. Is Ibis running at localhost:3020?',
      });
    }

    res.json({
      success: true,
      synced: true,
      writingDNA: data,
    });
  } catch (error) {
    console.error('[writing-dna] sync error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
