/**
 * Relational Intelligence Routes
 * Duo/team profiling for creative chemistry analysis.
 *
 * POST /duo   — analyze two creator profiles
 * POST /team  — analyze a team of creators
 */

const express = require('express');
const router = express.Router();
const relationalIntelligenceService = require('../services/relationalIntelligenceService');
const aiTwinService = require('../services/aiTwinService');

// Analyze a duo (two creators)
router.post('/duo', async (req, res) => {
  try {
    const { userId1, userId2, profile1, profile2 } = req.body;

    let p1 = profile1;
    let p2 = profile2;

    // If userIds provided, fetch profiles from aiTwinService
    if (userId1 && !p1) {
      const dna1 = await aiTwinService.getAestheticDNA(userId1);
      p1 = dna1?.subtaste ? {
        archetypePrimary: dna1.subtaste.primary?.designation,
        archetypeSecondary: dna1.subtaste.secondary?.designation,
        distribution: dna1.subtaste.distribution,
        audio: dna1.audio,
        visual: dna1.visual,
      } : null;
    }

    if (userId2 && !p2) {
      const dna2 = await aiTwinService.getAestheticDNA(userId2);
      p2 = dna2?.subtaste ? {
        archetypePrimary: dna2.subtaste.primary?.designation,
        archetypeSecondary: dna2.subtaste.secondary?.designation,
        distribution: dna2.subtaste.distribution,
        audio: dna2.audio,
        visual: dna2.visual,
      } : null;
    }

    if (!p1 || !p2) {
      return res.status(400).json({
        success: false,
        error: 'Both profiles required. Provide profile objects or valid userIds.',
      });
    }

    const result = relationalIntelligenceService.analyzeDuo(p1, p2);
    res.json(result);
  } catch (error) {
    console.error('[relational] duo analysis error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze a team of creators
router.post('/team', async (req, res) => {
  try {
    const { userIds, profiles } = req.body;

    let teamProfiles = profiles || [];

    // If userIds provided, fetch each profile
    if (userIds && userIds.length > 0 && teamProfiles.length === 0) {
      for (const uid of userIds) {
        const dna = await aiTwinService.getAestheticDNA(uid);
        if (dna?.subtaste) {
          teamProfiles.push({
            archetypePrimary: dna.subtaste.primary?.designation,
            archetypeSecondary: dna.subtaste.secondary?.designation,
            distribution: dna.subtaste.distribution,
            audio: dna.audio,
            visual: dna.visual,
          });
        }
      }
    }

    if (teamProfiles.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Need at least 2 profiles. Provide profiles array or userIds.',
      });
    }

    const result = relationalIntelligenceService.analyzeTeam(teamProfiles);
    res.json(result);
  } catch (error) {
    console.error('[relational] team analysis error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
