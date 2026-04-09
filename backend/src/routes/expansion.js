/**
 * Expansion Engine Routes — Lineage Discovery
 *
 * POST /api/expansion/discover     — trigger discovery run
 * GET  /api/expansion/suggestions/:userId — cached results
 * POST /api/expansion/rate         — rate an artifact (1-5 Likert)
 * GET  /api/expansion/saved/:userId — get saved/rated artifacts
 * DELETE /api/expansion/rate       — remove a rating
 */

const express = require('express');
const router = express.Router();
const expansionEngine = require('../services/expansionEngine');
const visualTaxonomy = require('../services/visualMovementTaxonomy');
const projectDnaService = require('../services/projectDnaService');
let artMovementClassifier;
try {
  artMovementClassifier = require('../services/artMovementClassifier');
} catch { /* Tizita not available — classifier disabled */ }

// Map art movement classifier names → taxonomy IDs
// Classifier uses high-signal photos (best=3x, favorites=2x, high-rated=1.5x)
const CLASSIFIER_TO_TAXONOMY = {
  'Bauhaus': 'bauhaus',
  'Brutalism': 'brutalism',
  'Memphis': 'memphis_design',
  'Minimalism': 'minimalism_art',
  'Swiss Design': 'swiss_international',
  'Art Deco': 'art_deco',
  'Art Nouveau': 'art_nouveau',
  'Wabi-sabi': 'wabi_sabi',
  'Kente Aesthetic': 'kente_weaving',
  'Ndebele Geometric': 'ndebele_geometry',
  'Nsibidi (Igbo Script)': 'nsibidi',
  'Adire (Yoruba Indigo)': 'adire_textile',
  'Tingatinga (Tanzania)': 'tingatinga',
  'Islamic Geometric': 'islamic_geometric',
  'Persian Miniature': 'persian_miniature',
  'Ukiyo-e (Japanese Woodblock)': 'ukiyo_e',
  'Mughal Miniature': 'mughal_miniature',
  'Warli (Maharashtra)': 'indian_warli',
  'Muralism': 'muralismo',
  'Tropicalia (Brazilian)': 'tropicalia_visual',
  'Neo-concretismo (Brazilian)': 'neo_concrete',
  'Mola (Guna/Kuna Textile)': 'guna_mola',
  'Shan Shui (Chinese Landscape)': 'chinese_literati',
};

// Trigger a lineage discovery run
router.post('/discover', async (req, res) => {
  try {
    const { userId = 'default', audioDna, visualDna } = req.body;

    const result = await expansionEngine.discoverLineage(userId, {
      audioDna,
      visualDna,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Expansion] Discovery error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get cached suggestions
router.get('/suggestions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const suggestions = expansionEngine.getSuggestions(userId);

    if (!suggestions) {
      return res.json({
        success: true,
        suggestions: null,
        message: 'No lineage discoveries yet. Run a discovery session first.',
      });
    }

    res.json({
      success: true,
      ...suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Rate an artifact (1-5 Likert)
router.post('/rate', (req, res) => {
  try {
    const { userId = 'default', artifact, rating, notes } = req.body;

    if (!artifact || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Requires artifact object and rating (1-5)',
      });
    }

    const result = expansionEngine.rateArtifact(userId, artifact, rating, notes || '');
    res.json(result);
  } catch (error) {
    console.error('[Expansion] Rate error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get saved/rated artifacts
router.get('/saved/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const saved = expansionEngine.getSavedArtifacts(userId);
    res.json({ success: true, saved, count: saved.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove a rating
router.delete('/rate', (req, res) => {
  try {
    const { userId = 'default', artifactKey } = req.body;
    if (!artifactKey) {
      return res.status(400).json({ success: false, error: 'Requires artifactKey' });
    }
    const result = expansionEngine.removeRating(userId, artifactKey);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Visual Lineage Discovery ──

// Match user's color palette to visual movements
// Optionally boosted by Project DNA references (high-signal)
router.post('/visual-lineage', (req, res) => {
  try {
    const { palette, userId } = req.body;
    if (!palette || !Array.isArray(palette) || palette.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Requires palette: array of hex color strings',
      });
    }

    // Fetch Project DNA for boost if userId provided
    let boosts = {};
    if (userId) {
      const projectDna = projectDnaService.getProjectDNA(userId);
      if (projectDna) {
        boosts = visualTaxonomy.getProjectDnaBoosts(projectDna);
      }
    }

    // Add high-signal photo boosts from art movement classifier
    // (best photos 3x, favorites 2x, high-rated 1.5x, low-rated -1x)
    let classifierSignal = null;
    if (artMovementClassifier) {
      try {
        const classifierResult = artMovementClassifier.classifyMovements();
        if (classifierResult?.movements) {
          classifierSignal = classifierResult.signal;
          for (const m of classifierResult.movements) {
            const taxId = CLASSIFIER_TO_TAXONOMY[m.name];
            if (taxId) {
              // Scale: classifier affinity 0-1 → boost 0-0.4
              boosts[taxId] = (boosts[taxId] || 0) + m.affinity * 0.4;
            }
          }
        }
      } catch { /* Tizita not connected — skip classifier */ }
    }

    const topMovements = visualTaxonomy.matchPaletteToMovements(palette, 8, boosts);
    const recommendations = visualTaxonomy.generateColorRecommendations(palette, topMovements);

    // Determine primary visual era
    const primary = topMovements[0];
    const secondary = topMovements[1] || null;

    res.json({
      success: true,
      visualEra: primary ? {
        movement: primary.movement.name,
        region: primary.movement.region,
        era: `${primary.movement.era_start}${primary.movement.era_end ? '-' + primary.movement.era_end : '+'}`,
        affinity: primary.affinity,
        context: primary.movement.cultural_context,
        practitioners: primary.movement.key_practitioners,
      } : null,
      dnaBoosted: Object.keys(boosts).length > 0,
      highSignalPhotos: classifierSignal || null,
      movements: topMovements.map(t => ({
        id: t.movement.id,
        name: t.movement.name,
        region: t.movement.region,
        affinity: Math.round(t.affinity * 100),
        matchCount: t.matchCount,
        boosted: t.boosted || false,
        era: `${t.movement.era_start}${t.movement.era_end ? '-' + t.movement.era_end : '+'}`,
        palette: t.movement.hex_palette,
        keywords: t.movement.keywords,
      })),
      recommendations,
      lineage: {
        primary: primary?.movement.name || null,
        secondary: secondary?.movement.name || null,
        adjacent: topMovements.slice(2, 5).map(t => t.movement.name),
      },
    });
  } catch (error) {
    console.error('[Expansion] Visual lineage error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all visual movements (for taxonomy browser)
router.get('/visual-movements', (req, res) => {
  const { region, era } = req.query;
  let results = visualTaxonomy.getAllMovements();

  if (region) {
    results = results.filter(m => m.region.toLowerCase().includes(region.toLowerCase()));
  }
  if (era) {
    results = results.filter(m => m.era_start <= Number(era) && (m.era_end === null || m.era_end >= Number(era)));
  }

  res.json({
    success: true,
    movements: results.map(m => ({
      id: m.id,
      name: m.name,
      region: m.region,
      era: `${m.era_start}${m.era_end ? '-' + m.era_end : '+'}`,
      hex_palette: m.hex_palette,
      keywords: m.keywords,
    })),
    count: results.length,
  });
});

// Find movement by hex color
router.get('/visual-movement-by-color', (req, res) => {
  const { hex } = req.query;
  if (!hex) {
    return res.status(400).json({ success: false, error: 'Requires hex query param' });
  }

  const normalizedHex = hex.startsWith('#') ? hex : `#${hex}`;
  const matches = visualTaxonomy.findMovementsByColor(normalizedHex, 5);

  res.json({
    success: true,
    query: normalizedHex,
    matches: matches.map(m => ({
      id: m.movement.id,
      name: m.movement.name,
      region: m.movement.region,
      matchedHex: m.matchedHex,
      distance: Math.round(m.distance * 10) / 10,
      palette: m.movement.hex_palette,
      practitioners: m.movement.key_practitioners,
      context: m.movement.cultural_context,
    })),
  });
});

module.exports = router;
