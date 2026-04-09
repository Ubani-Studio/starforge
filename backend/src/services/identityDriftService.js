/**
 * Identity Drift Service
 *
 * Tracks identity over time via snapshots. No psychometric system does this.
 * - Profile versioning: every signal update saves a timestamped snapshot
 * - Drift calculation: compare archetype distributions across snapshots
 * - Season detection: expansive, consolidating, or pivoting
 * - Influence absorption: track how new data shifts the profile
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../starforge_identity.db');

class IdentityDriftService {
  constructor() {
    this._ensureTable();
  }

  _ensureTable() {
    const db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS identity_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        archetype_primary TEXT,
        archetype_secondary TEXT,
        archetype_distribution_json TEXT,
        coherence_score REAL,
        audio_hash TEXT,
        visual_hash TEXT,
        writing_hash TEXT,
        signals_summary_json TEXT,
        narrative_text TEXT,
        season TEXT,
        trigger TEXT DEFAULT 'manual',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_snapshot_user_time
        ON identity_snapshots(user_id, created_at DESC);
    `);
    db.close();
  }

  /**
   * Create a snapshot of the current identity state.
   * @param {string} userId
   * @param {string} trigger - 'manual' | 'signal_change' | 'scheduled' | 'subtaste_rescan' | 'library_import' | 'tizita_sync' | 'ibis_sync'
   * @param {object} identityData - Pre-computed identity data (optional, will fetch if not provided)
   */
  createSnapshot(userId, trigger = 'manual', identityData = null) {
    const data = identityData || {};
    const subtaste = data.subtaste || null;

    // Determine season based on existing snapshots
    const season = this._detectSeasonInternal(userId, subtaste);

    const db = new Database(DB_PATH);
    const result = db.prepare(`
      INSERT INTO identity_snapshots
      (user_id, archetype_primary, archetype_secondary, archetype_distribution_json,
       coherence_score, audio_hash, visual_hash, writing_hash,
       signals_summary_json, narrative_text, season, trigger)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      subtaste?.primary?.designation || data.archetypePrimary || null,
      subtaste?.secondary?.designation || data.archetypeSecondary || null,
      JSON.stringify(subtaste?.distribution || data.distribution || {}),
      data.coherenceScore ?? null,
      data.audioHash || null,
      data.visualHash || null,
      data.writingHash || null,
      JSON.stringify(data.signalsSummary || {}),
      data.narrativeText || null,
      season,
      trigger,
    );
    db.close();

    return {
      id: result.lastInsertRowid,
      season,
      trigger,
    };
  }

  /**
   * Get timeline of all snapshots for a user.
   */
  getTimeline(userId, limit = 50) {
    const db = new Database(DB_PATH);
    const rows = db.prepare(`
      SELECT * FROM identity_snapshots
      WHERE user_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `).all(userId, limit);
    db.close();

    return rows.map(r => ({
      id: r.id,
      archetypePrimary: r.archetype_primary,
      archetypeSecondary: r.archetype_secondary,
      distribution: JSON.parse(r.archetype_distribution_json || '{}'),
      coherenceScore: r.coherence_score,
      season: r.season,
      trigger: r.trigger,
      createdAt: r.created_at,
    }));
  }

  /**
   * Calculate drift between current state and a window of time ago.
   */
  calculateDrift(userId, windowDays = 90) {
    const db = new Database(DB_PATH);

    // Get latest snapshot
    const latest = db.prepare(`
      SELECT * FROM identity_snapshots
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId);

    if (!latest) {
      db.close();
      return { hasDrift: false, message: 'No snapshots yet' };
    }

    // Get snapshot from ~windowDays ago
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    const older = db.prepare(`
      SELECT * FROM identity_snapshots
      WHERE user_id = ? AND created_at <= ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId, cutoff);

    // Get all snapshots in window for trajectory analysis
    const windowSnapshots = db.prepare(`
      SELECT * FROM identity_snapshots
      WHERE user_id = ? AND created_at >= ?
      ORDER BY created_at ASC
    `).all(userId, cutoff);

    db.close();

    if (!older || windowSnapshots.length < 2) {
      return {
        hasDrift: false,
        message: 'Need more snapshots for drift analysis',
        snapshotCount: windowSnapshots.length,
      };
    }

    const latestDist = JSON.parse(latest.archetype_distribution_json || '{}');
    const olderDist = JSON.parse(older.archetype_distribution_json || '{}');

    // Calculate distribution shift
    const allDesignations = new Set([...Object.keys(latestDist), ...Object.keys(olderDist)]);
    let totalShift = 0;
    const dimensionShifts = {};

    for (const d of allDesignations) {
      const shift = (latestDist[d] || 0) - (olderDist[d] || 0);
      dimensionShifts[d] = Math.round(shift * 1000) / 1000;
      totalShift += Math.abs(shift);
    }

    // Find most shifted dimension
    let mostShifted = null;
    let maxShift = 0;
    for (const [d, shift] of Object.entries(dimensionShifts)) {
      if (Math.abs(shift) > maxShift) {
        maxShift = Math.abs(shift);
        mostShifted = { designation: d, shift, direction: shift > 0 ? 'rising' : 'falling' };
      }
    }

    // Coherence trajectory
    const coherenceValues = windowSnapshots
      .filter(s => s.coherence_score != null)
      .map(s => s.coherence_score);
    const coherenceDelta = coherenceValues.length >= 2
      ? coherenceValues[coherenceValues.length - 1] - coherenceValues[0]
      : 0;

    // Archetype stability
    const primaryChanged = latest.archetype_primary !== older.archetype_primary;

    return {
      hasDrift: true,
      windowDays,
      snapshotCount: windowSnapshots.length,
      totalShift: Math.round(totalShift * 100) / 100,
      totalShiftPercent: Math.round(totalShift * 50), // normalized to 0-100%
      dimensionShifts,
      mostShifted,
      primaryArchetype: {
        current: latest.archetype_primary,
        previous: older.archetype_primary,
        changed: primaryChanged,
      },
      coherence: {
        current: latest.coherence_score,
        previous: older.coherence_score,
        delta: Math.round(coherenceDelta * 100) / 100,
        trajectory: coherenceDelta > 0.05 ? 'rising' : coherenceDelta < -0.05 ? 'falling' : 'stable',
      },
      currentSeason: latest.season,
    };
  }

  /**
   * Detect current creative season.
   */
  detectSeason(userId) {
    const db = new Database(DB_PATH);
    const latest = db.prepare(`
      SELECT season FROM identity_snapshots
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId);
    db.close();

    return latest?.season || null;
  }

  /**
   * Internal season detection based on recent trajectory.
   */
  _detectSeasonInternal(userId, currentSubtaste) {
    const db = new Database(DB_PATH);
    const recent = db.prepare(`
      SELECT * FROM identity_snapshots
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(userId);
    db.close();

    if (recent.length < 2) return 'unknown';

    // Check coherence trajectory
    const coherenceValues = recent
      .filter(s => s.coherence_score != null)
      .map(s => s.coherence_score)
      .reverse(); // oldest to newest

    let coherenceTrend = 'stable';
    if (coherenceValues.length >= 2) {
      const delta = coherenceValues[coherenceValues.length - 1] - coherenceValues[0];
      if (delta > 0.05) coherenceTrend = 'rising';
      else if (delta < -0.05) coherenceTrend = 'falling';
    }

    // Check archetype stability
    const primaries = recent.map(s => s.archetype_primary).filter(Boolean);
    const uniquePrimaries = new Set(primaries);
    const archetypeStable = uniquePrimaries.size === 1;

    // Check distribution entropy (how spread out across archetypes)
    const latestDist = JSON.parse(recent[0]?.archetype_distribution_json || '{}');
    const values = Object.values(latestDist).filter(v => v > 0);
    const entropy = values.reduce((sum, v) => sum - v * Math.log2(v + 1e-10), 0);
    const maxEntropy = Math.log2(values.length || 1);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    // Season detection logic
    if (!archetypeStable && (coherenceTrend === 'falling' || normalizedEntropy > 0.7)) {
      return 'pivoting'; // Sharp change
    }
    if (coherenceTrend === 'falling' && normalizedEntropy > 0.6) {
      return 'expanding'; // Exploring new territory
    }
    if (coherenceTrend === 'rising' && archetypeStable) {
      return 'consolidating'; // Narrowing, deepening
    }

    return 'stable';
  }
}

module.exports = new IdentityDriftService();
