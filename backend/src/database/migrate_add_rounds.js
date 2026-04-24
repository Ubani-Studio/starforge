/**
 * Migration: create rounds table.
 *
 * Pipeline prompt §15: rounds is the resonance-signal ecosystem API
 * every downstream app consults. Qualn ranks clips, Slayt ranks post
 * candidates, Ibis surfaces "related to what you're writing about".
 *
 * Shape: one row per (user, anchor_asset_id, project_id) with a
 * resonance score + breakdown. The scorer is a simple linear blend
 * of taste-match, recency, and archive-depth signals; downstream
 * apps only see the final score + breakdown.
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../starforge_audio.db');
const db = new Database(dbPath);

console.log('🔄 Running migration: create rounds table');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      anchor_asset_id TEXT NOT NULL,
      anchor_kind TEXT NOT NULL DEFAULT 'unknown',
      anchor_source_app TEXT,
      resonance_score REAL NOT NULL DEFAULT 0,
      breakdown TEXT NOT NULL DEFAULT '{}',
      computed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, project_id, anchor_asset_id)
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rounds_user_project
           ON rounds(user_id, project_id, resonance_score DESC);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rounds_computed
           ON rounds(computed_at);`);
  console.log('✅ rounds table ready');
} catch (err) {
  console.error('❌ migration failed:', err);
  process.exit(1);
}

db.close();
process.exit(0);
