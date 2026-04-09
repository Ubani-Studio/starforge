const Database = require('better-sqlite3');
const path = require('path');

/**
 * Subtaste Genome Cache Service
 * Caches genome data from Subtaste quiz in local SQLite
 * so Nommo loads instantly and survives Subtaste downtime.
 */
class SubtasteGenomeCacheService {
  constructor() {
    this.dbPath = path.join(__dirname, '../../starforge_identity.db');
    this.db = null;
    this.init();
  }

  init() {
    this.db = new Database(this.dbPath);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subtaste_genome_cache (
        user_id TEXT PRIMARY KEY,
        subtaste_user_id TEXT,
        primary_designation TEXT,
        primary_glyph TEXT,
        primary_confidence REAL DEFAULT 0,
        secondary_designation TEXT,
        secondary_glyph TEXT,
        distribution_json TEXT,
        psychometrics_json TEXT,
        signal_count INTEGER DEFAULT 0,
        stages_completed TEXT,
        genome_json TEXT,
        source TEXT DEFAULT 'quiz',
        fetched_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS subtaste_genome_checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        subtaste_user_id TEXT,
        primary_designation TEXT,
        primary_glyph TEXT,
        genome_json TEXT NOT NULL,
        signal_count INTEGER DEFAULT 0,
        trigger TEXT DEFAULT 'fetch',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_checkpoints_user ON subtaste_genome_checkpoints(user_id, created_at DESC);
    `);

    console.log('Subtaste genome cache initialized');
  }

  /**
   * Get cached genome for a Nommo userId
   */
  getCache(userId) {
    try {
      const row = this.db.prepare(
        'SELECT * FROM subtaste_genome_cache WHERE user_id = ?'
      ).get(userId);

      if (!row) return null;

      return {
        userId: row.user_id,
        subtasteUserId: row.subtaste_user_id,
        primary: {
          designation: row.primary_designation,
          glyph: row.primary_glyph,
          confidence: row.primary_confidence,
        },
        secondary: row.secondary_designation ? {
          designation: row.secondary_designation,
          glyph: row.secondary_glyph,
        } : null,
        distribution: row.distribution_json ? JSON.parse(row.distribution_json) : null,
        psychometrics: row.psychometrics_json ? JSON.parse(row.psychometrics_json) : null,
        signalCount: row.signal_count,
        stagesCompleted: row.stages_completed ? row.stages_completed.split(',') : [],
        genome: row.genome_json ? JSON.parse(row.genome_json) : null,
        source: row.source,
        fetchedAt: row.fetched_at,
        cachedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error reading genome cache:', error);
      return null;
    }
  }

  /**
   * Save genome data to cache (upsert).
   * Always checkpoints EXISTING data before overwriting, so Nommo
   * never loses data even if Subtaste malfunctions.
   */
  saveCache(userId, subtasteUserId, genomeData, source = 'quiz') {
    try {
      const archetype = genomeData.archetype || genomeData;
      const primary = archetype.primary || archetype;
      const secondary = archetype.secondary || null;

      // Validate: refuse to save empty/corrupt genome data
      if (!primary.designation && !primary.glyph) {
        console.warn(`[Nommo] Rejected cache save for ${userId}: no archetype designation or glyph in incoming data`);
        return;
      }

      // Checkpoint EXISTING data before overwriting (protect against Subtaste data loss)
      const existing = this.getCache(userId);
      if (existing && existing.genome) {
        const existingSignals = existing.signalCount || 0;
        const incomingSignals = genomeData.signalCount || genomeData.signal_count || 0;

        // Save existing data as checkpoint before any overwrite
        this.saveCheckpoint(userId, existing.subtasteUserId, existing.genome, 'pre_update');
        console.log(`[Nommo] Checkpointed existing genome for ${userId} (${existingSignals} signals, ${existing.primary?.designation}) before update`);

        // Guard: if incoming has fewer signals, warn (calibration should only add)
        if (incomingSignals < existingSignals && incomingSignals > 0) {
          console.warn(`[Nommo] WARNING: incoming genome has fewer signals (${incomingSignals}) than existing (${existingSignals}) for ${userId}. Saving anyway but checkpoint preserved.`);
        }
      }

      this.db.prepare(`
        INSERT OR REPLACE INTO subtaste_genome_cache (
          user_id, subtaste_user_id,
          primary_designation, primary_glyph, primary_confidence,
          secondary_designation, secondary_glyph,
          distribution_json, psychometrics_json,
          signal_count, stages_completed,
          genome_json, source, fetched_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        userId,
        subtasteUserId || null,
        primary.designation || null,
        primary.glyph || null,
        primary.confidence || 0,
        secondary?.designation || null,
        secondary?.glyph || null,
        archetype.distribution ? JSON.stringify(archetype.distribution) : null,
        genomeData.psychometrics ? JSON.stringify(genomeData.psychometrics) : null,
        genomeData.signalCount || genomeData.signal_count || 0,
        Array.isArray(genomeData.stagesCompleted)
          ? genomeData.stagesCompleted.join(',')
          : (genomeData.stages_completed || ''),
        JSON.stringify(genomeData),
        source
      );

      console.log(`[Nommo] Genome cached for ${userId} (source: ${source}, signals: ${genomeData.signalCount || genomeData.signal_count || 0})`);

      // Also checkpoint the new data
      const trigger = source === 'calibration' ? 'calibration' : 'fetch';
      this.saveCheckpoint(userId, subtasteUserId, genomeData, trigger);
    } catch (error) {
      console.error('Error saving genome cache:', error);
    }
  }

  /**
   * Get linked subtaste_user_id for a Nommo userId
   */
  getSubtasteUserId(userId) {
    try {
      const row = this.db.prepare(
        'SELECT subtaste_user_id FROM subtaste_genome_cache WHERE user_id = ?'
      ).get(userId);
      return row?.subtaste_user_id || null;
    } catch (error) {
      console.error('Error getting subtaste user ID:', error);
      return null;
    }
  }

  /**
   * Link a Nommo userId to a Subtaste userId
   */
  linkUser(userId, subtasteUserId) {
    try {
      const existing = this.getCache(userId);
      if (existing) {
        this.db.prepare(
          'UPDATE subtaste_genome_cache SET subtaste_user_id = ?, updated_at = datetime(\'now\') WHERE user_id = ?'
        ).run(subtasteUserId, userId);
      } else {
        this.db.prepare(
          'INSERT INTO subtaste_genome_cache (user_id, subtaste_user_id) VALUES (?, ?)'
        ).run(userId, subtasteUserId);
      }
      console.log(`Linked ${userId} -> ${subtasteUserId}`);
    } catch (error) {
      console.error('Error linking user:', error);
    }
  }

  /**
   * Save a genome checkpoint for rollback/history
   */
  saveCheckpoint(userId, subtasteUserId, genomeData, trigger = 'fetch') {
    try {
      const archetype = genomeData.archetype || genomeData;
      const primary = archetype.primary || archetype;

      this.db.prepare(`
        INSERT INTO subtaste_genome_checkpoints (
          user_id, subtaste_user_id,
          primary_designation, primary_glyph,
          genome_json, signal_count, trigger
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        subtasteUserId || null,
        primary.designation || null,
        primary.glyph || null,
        JSON.stringify(genomeData),
        genomeData.signalCount || genomeData.signal_count || 0,
        trigger
      );

      // Keep max 20 checkpoints per user, delete oldest beyond that
      const count = this.db.prepare(
        'SELECT COUNT(*) AS cnt FROM subtaste_genome_checkpoints WHERE user_id = ?'
      ).get(userId).cnt;

      if (count > 20) {
        this.db.prepare(`
          DELETE FROM subtaste_genome_checkpoints
          WHERE user_id = ? AND id NOT IN (
            SELECT id FROM subtaste_genome_checkpoints
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
          )
        `).run(userId, userId);
      }

      console.log(`Genome checkpoint saved for ${userId} (trigger: ${trigger})`);
    } catch (error) {
      console.error('Error saving genome checkpoint:', error);
    }
  }

  /**
   * List recent checkpoints for a user
   */
  listCheckpoints(userId) {
    try {
      const rows = this.db.prepare(`
        SELECT id, primary_designation, signal_count, trigger, created_at
        FROM subtaste_genome_checkpoints
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(userId);

      return rows.map(row => ({
        id: row.id,
        primaryDesignation: row.primary_designation,
        signalCount: row.signal_count,
        trigger: row.trigger,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Error listing checkpoints:', error);
      return [];
    }
  }

  /**
   * Restore genome from a checkpoint back into the main cache
   */
  restoreFromCheckpoint(userId, checkpointId) {
    try {
      const checkpoint = this.db.prepare(
        'SELECT * FROM subtaste_genome_checkpoints WHERE id = ? AND user_id = ?'
      ).get(checkpointId, userId);

      if (!checkpoint) {
        console.error(`Checkpoint ${checkpointId} not found for user ${userId}`);
        return null;
      }

      const genomeData = JSON.parse(checkpoint.genome_json);

      // Write back to main cache table (without triggering another checkpoint)
      const archetype = genomeData.archetype || genomeData;
      const primary = archetype.primary || archetype;
      const secondary = archetype.secondary || null;

      this.db.prepare(`
        INSERT OR REPLACE INTO subtaste_genome_cache (
          user_id, subtaste_user_id,
          primary_designation, primary_glyph, primary_confidence,
          secondary_designation, secondary_glyph,
          distribution_json, psychometrics_json,
          signal_count, stages_completed,
          genome_json, source, fetched_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        userId,
        checkpoint.subtaste_user_id || null,
        primary.designation || null,
        primary.glyph || null,
        primary.confidence || 0,
        secondary?.designation || null,
        secondary?.glyph || null,
        archetype.distribution ? JSON.stringify(archetype.distribution) : null,
        genomeData.psychometrics ? JSON.stringify(genomeData.psychometrics) : null,
        genomeData.signalCount || genomeData.signal_count || 0,
        Array.isArray(genomeData.stagesCompleted)
          ? genomeData.stagesCompleted.join(',')
          : (genomeData.stages_completed || ''),
        JSON.stringify(genomeData),
        'checkpoint_restore'
      );

      console.log(`Genome restored from checkpoint ${checkpointId} for ${userId}`);
      return genomeData;
    } catch (error) {
      console.error('Error restoring from checkpoint:', error);
      return null;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = new SubtasteGenomeCacheService();
