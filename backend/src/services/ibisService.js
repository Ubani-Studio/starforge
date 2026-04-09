/**
 * Ibis Service
 * Fetches and caches WritingDNA from Ibis (Vaulted Ink) at localhost:3020.
 * WritingDNA = quantitative metrics + qualitative patterns + voice signature.
 *
 * This is the 5th identity signal for the Twin OS (alongside Audio, Visual,
 * Project DNA, and Taste Archetype).
 */

const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');

const IBIS_URL = process.env.IBIS_URL || 'http://localhost:3020';
const API_SECRET = process.env.ECOSYSTEM_API_SECRET || 'dev-secret-change-in-production';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

class IbisService {
  constructor() {
    this.dbPath = path.join(__dirname, '../../starforge_identity.db');
    this._ensureTable();
  }

  _ensureTable() {
    const db = new Database(this.dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS writing_dna_cache (
        user_id TEXT PRIMARY KEY,
        signature TEXT,
        metrics_json TEXT,
        patterns_json TEXT,
        word_count INTEGER DEFAULT 0,
        version INTEGER DEFAULT 0,
        analyzed_doc_count INTEGER DEFAULT 0,
        analyzed_at TEXT,
        fetched_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.close();
  }

  /**
   * Fetch WritingDNA from Ibis export endpoint and cache locally.
   */
  async fetchWritingDNA(userId) {
    try {
      const res = await axios.get(`${IBIS_URL}/api/writing-dna/export`, {
        headers: { 'X-Internal-API-Key': API_SECRET },
        timeout: 10000,
      });

      if (!res.data?.ok || !res.data?.dna) {
        return null;
      }

      const { dna } = res.data;

      // Cache in SQLite
      const db = new Database(this.dbPath);
      db.prepare(`
        INSERT OR REPLACE INTO writing_dna_cache
        (user_id, signature, metrics_json, patterns_json, word_count, version, analyzed_doc_count, analyzed_at, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        userId,
        dna.signature || '',
        JSON.stringify(dna.metrics),
        JSON.stringify(dna.patterns),
        dna.metrics?.totalWords || 0,
        dna.version || 1,
        dna.analyzedDocumentCount || 0,
        dna.analyzedAt || null,
      );
      db.close();

      return this._formatDNA(dna);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.warn('[ibis] Ibis not running at', IBIS_URL);
      } else {
        console.error('[ibis] Failed to fetch WritingDNA:', error.message);
      }
      return null;
    }
  }

  /**
   * Get cached WritingDNA. Refetch if stale (> 1 hour).
   */
  async getCached(userId) {
    try {
      const db = new Database(this.dbPath);
      const row = db.prepare('SELECT * FROM writing_dna_cache WHERE user_id = ?').get(userId);
      db.close();

      if (!row) {
        // No cache — fetch fresh
        return this.fetchWritingDNA(userId);
      }

      // Check freshness
      const fetchedAt = new Date(row.fetched_at).getTime();
      if (Date.now() - fetchedAt > CACHE_MAX_AGE_MS) {
        // Stale — refetch in background, return cached for now
        this.fetchWritingDNA(userId).catch(() => {});
      }

      return this._formatFromRow(row);
    } catch (error) {
      console.error('[ibis] Cache read error:', error.message);
      return null;
    }
  }

  /**
   * Force sync from Ibis (used by manual rescan button).
   */
  async sync(userId) {
    return this.fetchWritingDNA(userId);
  }

  /**
   * Get raw cached data without refetch (for snapshot/drift purposes).
   */
  getCachedSync(userId) {
    try {
      const db = new Database(this.dbPath);
      const row = db.prepare('SELECT * FROM writing_dna_cache WHERE user_id = ?').get(userId);
      db.close();
      return row ? this._formatFromRow(row) : null;
    } catch {
      return null;
    }
  }

  _formatDNA(dna) {
    return {
      signature: dna.signature,
      metrics: dna.metrics,
      patterns: dna.patterns,
      wordCount: dna.metrics?.totalWords || 0,
      version: dna.version || 1,
      analyzedDocumentCount: dna.analyzedDocumentCount || 0,
      analyzedAt: dna.analyzedAt || null,
    };
  }

  _formatFromRow(row) {
    return {
      signature: row.signature,
      metrics: JSON.parse(row.metrics_json || '{}'),
      patterns: JSON.parse(row.patterns_json || '{}'),
      wordCount: row.word_count || 0,
      version: row.version || 1,
      analyzedDocumentCount: row.analyzed_doc_count || 0,
      analyzedAt: row.analyzed_at || null,
      fetchedAt: row.fetched_at,
    };
  }
}

module.exports = new IbisService();
