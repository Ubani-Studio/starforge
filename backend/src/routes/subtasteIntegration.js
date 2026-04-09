/**
 * Subtaste Integration Routes
 *
 * Proxy routes to the standalone Subtaste app (port 3001)
 * for quiz genome data. Uses local SQLite cache so data
 * persists across page refreshes and survives Subtaste downtime.
 *
 * GET /health                  — Check if Subtaste app is reachable
 * GET /genome/:userId          — Fetch genome (cache-first, background refresh)
 * GET /genome/:userId/cached   — Cache only (instant, no Subtaste call)
 * POST /genome/:userId/link    — Link Nommo userId to Subtaste userId
 * POST /genome/:userId/rescan  — Force re-fetch from Subtaste
 * GET /auto/:userId            — Auto-classification from local signals
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');
const subtasteService = require('../services/subtasteService');
const projectDnaService = require('../services/projectDnaService');
const sonicPaletteService = require('../services/sonicPaletteService');
const sinkEnhanced = require('../services/sinkEnhanced');
const genomeCache = require('../services/subtasteGenomeCache');

const audioDbPath = path.join(__dirname, '../../starforge_audio.db');

const SUBTASTE_URL = process.env.SUBTASTE_API_URL || 'http://localhost:3001';

/**
 * Fetch genome from Subtaste and cache it.
 * Returns the genome data or null on failure.
 */
async function fetchAndCacheGenome(userId, subtasteUserId) {
  if (!subtasteUserId) return null;

  const response = await axios.get(
    `${SUBTASTE_URL}/api/v2/genome/${subtasteUserId}/public`,
    { timeout: 5000 }
  );

  if (response.data) {
    genomeCache.saveCache(userId, subtasteUserId, response.data, 'quiz');
    return response.data;
  }
  return null;
}

/**
 * Safe background fetch: only update cache if incoming has more signals.
 * Prevents quiz regressions from overwriting richer cached profiles.
 */
async function fetchAndCacheGenomeSafe(userId, subtasteUserId, existingSignalCount) {
  if (!subtasteUserId) return null;

  try {
    const response = await axios.get(
      `${SUBTASTE_URL}/api/v2/genome/${subtasteUserId}/public`,
      { timeout: 5000 }
    );

    if (response.data) {
      const incomingSignals = response.data.signalCount || response.data.signal_count || 0;

      // Update if incoming has more signals, OR same count but data may have changed
      // (reclassification can change distribution without adding signals)
      if (incomingSignals >= existingSignalCount) {
        genomeCache.saveCache(userId, subtasteUserId, response.data, 'quiz');
        console.log(`[Subtaste] Background refresh updated cache (${incomingSignals} signals, was ${existingSignalCount})`);
        return response.data;
      } else {
        console.log(`[Subtaste] Background refresh skipped — cached has ${existingSignalCount} signals, incoming has ${incomingSignals}`);
      }
    }
  } catch (err) {
    // Silent fail for background refresh
    console.log('[Subtaste] Background refresh error:', err.message);
  }
  return null;
}

// Health check — is Subtaste app running?
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${SUBTASTE_URL}/api/health`, {
      timeout: 3000,
    });
    res.json({ connected: true, status: response.data });
  } catch {
    res.json({ connected: false });
  }
});

// Fetch quiz-based genome (cache-first, only update if incoming has more signals)
router.get('/genome/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const subtasteUserId = req.query.subtaste_user_id || genomeCache.getSubtasteUserId(userId);

    // Cache-first: serve cached data immediately if available
    const cached = genomeCache.getCache(userId);
    if (cached && cached.genome) {
      // Background refresh: try Subtaste but only update if incoming has MORE signals
      if (subtasteUserId) {
        fetchAndCacheGenomeSafe(userId, subtasteUserId, cached.signalCount || 0)
          .catch(err => console.log('[Subtaste] Background refresh failed:', err.message));
      }

      return res.json({
        success: true,
        source: cached.source || 'cache',
        genome: cached.genome,
      });
    }

    // No cache — try live fetch from Subtaste
    if (subtasteUserId) {
      try {
        const genome = await fetchAndCacheGenome(userId, subtasteUserId);
        if (genome) {
          return res.json({
            success: true,
            source: 'quiz',
            genome,
          });
        }
      } catch (fetchErr) {
        console.log('[Subtaste] Live fetch failed:', fetchErr.message);
      }
    }

    // No cache, no Subtaste — redirect to quiz
    return res.status(404).json({
      success: false,
      error: 'No genome found. Take the Subtaste quiz to generate one.',
      quizUrl: `${SUBTASTE_URL}/quiz`,
    });
  } catch (error) {
    // Last resort: try cache
    const cached = genomeCache.getCache(req.params.userId);
    if (cached) {
      return res.json({
        success: true,
        source: 'cache',
        genome: cached.genome,
      });
    }

    res.status(503).json({
      success: false,
      error: 'Subtaste app not reachable',
      quizUrl: `${SUBTASTE_URL}/quiz`,
    });
  }
});

// Cache-only endpoint (instant, no Subtaste call)
router.get('/genome/:userId/cached', (req, res) => {
  const { userId } = req.params;
  const cached = genomeCache.getCache(userId);

  if (cached) {
    return res.json({
      success: true,
      source: cached.source || 'cache',
      genome: cached.genome,
      subtasteUserId: cached.subtasteUserId || null,
      stagesCompleted: cached.stagesCompleted || [],
      signalCount: cached.signalCount || 0,
      cachedAt: cached.cachedAt,
    });
  }

  res.json({ success: false, cached: false });
});

// Link Nommo userId to Subtaste userId, then fetch + cache genome
router.post('/genome/:userId/link', async (req, res) => {
  try {
    const { userId } = req.params;
    const { subtaste_user_id } = req.body;

    if (!subtaste_user_id) {
      return res.status(400).json({ success: false, error: 'subtaste_user_id required' });
    }

    genomeCache.linkUser(userId, subtaste_user_id);

    // Immediately fetch and cache the genome
    try {
      const genome = await fetchAndCacheGenome(userId, subtaste_user_id);
      if (genome) {
        return res.json({
          success: true,
          source: 'quiz',
          genome,
          linked: true,
        });
      }
    } catch (fetchErr) {
      console.log('[Subtaste] Fetch after link failed:', fetchErr.message);
    }

    res.json({ success: true, linked: true, genome: null });
  } catch (error) {
    console.error('[Subtaste] Link error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Force re-fetch from Subtaste (rescan) — respects signal count guard
router.post('/genome/:userId/rescan', async (req, res) => {
  try {
    const { userId } = req.params;
    const subtasteUserId = req.body.subtaste_user_id || genomeCache.getSubtasteUserId(userId);
    const force = req.body.force === true;

    if (!subtasteUserId) {
      return res.status(400).json({
        success: false,
        error: 'No linked Subtaste user. Take the quiz first.',
        quizUrl: `${SUBTASTE_URL}/quiz`,
      });
    }

    // Check existing cache signal count
    const cached = genomeCache.getCache(userId);
    const existingSignals = cached?.signalCount || 0;

    const response = await axios.get(
      `${SUBTASTE_URL}/api/v2/genome/${subtasteUserId}/public`,
      { timeout: 5000 }
    );

    if (response.data) {
      const incomingSignals = response.data.signalCount || response.data.signal_count || 0;

      // Guard: don't overwrite richer cache unless forced
      if (!force && incomingSignals < existingSignals && existingSignals > 0) {
        console.warn(`[Subtaste] Rescan blocked: incoming ${incomingSignals} < cached ${existingSignals} signals. Use force=true to override.`);
        return res.json({
          success: true,
          source: cached.source || 'cache',
          genome: cached.genome,
          rescanned: false,
          reason: `Cached profile has ${existingSignals} signals vs incoming ${incomingSignals}. Retake the full quiz to update.`,
        });
      }

      genomeCache.saveCache(userId, subtasteUserId, response.data, 'quiz');
      return res.json({
        success: true,
        source: 'quiz',
        genome: response.data,
        rescanned: true,
      });
    }

    res.status(503).json({
      success: false,
      error: 'Could not reach Subtaste to rescan',
    });
  } catch (error) {
    console.error('[Subtaste] Rescan error:', error.message);

    // Fall back to cache on error
    const cached = genomeCache.getCache(req.params.userId);
    if (cached) {
      return res.json({
        success: true,
        source: 'cache',
        genome: cached.genome,
        rescanned: false,
      });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-classify from existing Starforge signals (no quiz needed)
router.get('/auto/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Gather all available signals (auto-scans once if not cached, then uses DB)
    const projectDNA = await projectDnaService.getOrScanProjectDNA(userId === 'default_user' ? 'default' : userId);

    // Audio DNA from database
    let audioDNA = null;
    try {
      const db = new Database(audioDbPath, { readonly: true });
      const tracks = db.prepare('SELECT * FROM audio_tracks ORDER BY quality_score DESC LIMIT 500').all();
      if (tracks.length > 0) {
        const tasteCoherence = sinkEnhanced.calculateTasteCoherence(tracks);

        // Genre distribution for influence genealogy
        const genres = tracks.map(t => t.genre).filter(g => g);
        const genreCounts = {};
        genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
        const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
        const primaryGenre = sortedGenres[0]?.[0] || 'unknown';

        // Sonic palette from track energy/valence
        const energies = tracks.map(t => t.energy).filter(e => e != null);
        const avgEnergy = energies.length ? energies.reduce((a, b) => a + b, 0) / energies.length : 0.5;
        const valences = tracks.map(t => t.valence).filter(v => v != null);
        const avgValence = valences.length ? valences.reduce((a, b) => a + b, 0) / valences.length : 0.5;

        audioDNA = {
          taste_coherence: {
            overall: tasteCoherence.overall,
            genre_coherence: tasteCoherence.genreCoherence,
            energy_variance: tasteCoherence.energyConsistency,
            bpm_consistency: tasteCoherence.bpmConsistency,
            key_coherence: tasteCoherence.keyCoherence,
          },
          sonic_palette: {
            bass: avgEnergy > 0.7 ? avgEnergy * 0.8 : 0.4,
            energy: avgEnergy,
            valence: avgValence,
          },
          influence_genealogy: {
            primary_genre: primaryGenre,
          },
        };
      }
      db.close();
    } catch { /* no audio DB */ }

    // Visual DNA from Tizita connection cache (in-memory Map in twinVisualDna.js)
    // Fall back to direct Tizita API if cache is empty
    let visualDNA = null;
    try {
      const tizitaDirectService = require('../services/tizitaServiceDirect');
      const deepAnalysis = await tizitaDirectService.fetchDeepAnalysis(1);
      if (deepAnalysis) {
        const baseChars = deepAnalysis.base_characteristics || {};
        visualDNA = {
          warmth: baseChars.warmth,
          energy: baseChars.energy,
          themes: baseChars.themes || [],
        };
      }
    } catch { /* Tizita not available */ }

    // Run classification with all available signals
    const result = subtasteService.classifyUser({
      projectDNA,
      audioDNA,
      visualDNA,
    });

    if (!result) {
      return res.json({
        success: true,
        source: 'auto',
        classification: null,
        message: 'Not enough signal for classification. Add more data sources.',
      });
    }

    res.json({
      success: true,
      source: 'auto',
      classification: result.classification,
      psychometrics: result.psychometrics,
    });
  } catch (error) {
    console.error('[Subtaste] Auto-classify error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
