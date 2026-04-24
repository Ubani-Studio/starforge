/**
 * Rounds API.
 *
 * Pipeline prompt §15: rounds is the resonance-signal ecosystem API.
 * Qualn ranks clips by rounds score, Slayt ranks post candidates
 * from the archive, Ibis surfaces related voicenotes on the document
 * being written.
 *
 * GET  /api/rounds/:userId?project=X&limit=20     ranked rounds
 * POST /api/rounds/score                          recompute rounds
 *                                                 for (user, project,
 *                                                 anchor list)
 * DELETE /api/rounds/:userId?project=X            clear cache
 */
const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../../starforge_audio.db');
function db() {
  return new Database(dbPath);
}

function rowToJson(row) {
  if (!row) return null;
  let breakdown = {};
  try { breakdown = JSON.parse(row.breakdown); } catch { /* keep empty */ }
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    anchorAssetId: row.anchor_asset_id,
    anchorKind: row.anchor_kind,
    anchorSourceApp: row.anchor_source_app,
    resonanceScore: row.resonance_score,
    breakdown,
    computedAt: row.computed_at,
  };
}

/**
 * GET /api/rounds/:userId
 *
 * Ranked rounds for a user, optionally scoped to a project.
 */
router.get('/:userId', (req, res) => {
  const userId = req.params.userId;
  const projectId = req.query.project ?? null;
  const limit = Math.min(
    Math.max(1, parseInt(req.query.limit, 10) || 20),
    200,
  );
  const minScore = Math.max(0, Math.min(1, parseFloat(req.query.min) || 0));

  const conn = db();
  try {
    const rows = conn
      .prepare(
        `SELECT * FROM rounds
         WHERE user_id = ?
           AND (? IS NULL OR project_id = ? OR (project_id IS NULL AND ? IS NULL))
           AND resonance_score >= ?
         ORDER BY resonance_score DESC, computed_at DESC
         LIMIT ?`,
      )
      .all(userId, projectId, projectId, projectId, minScore, limit);
    res.json({
      rounds: rows.map(rowToJson),
      count: rows.length,
      userId,
      projectId,
    });
  } finally {
    conn.close();
  }
});

/**
 * POST /api/rounds/score
 *
 * Upsert rounds for a user. Accepts an explicit anchors array so
 * downstream apps (Qualn, Slayt, Ibis) can push resonance candidates
 * without Starforge owning every federation read. The scoring is a
 * weighted blend the caller provides via `breakdown`; Starforge
 * stores the final resonance_score + breakdown + returns the
 * upserted rows.
 *
 * Body:
 *   userId         string (required)
 *   projectId?     string
 *   anchors:       Array<{
 *                    assetId: string,
 *                    kind?: "text" | "audio" | "image" | "video",
 *                    sourceApp?: "ibis" | "tizita" | "sankore" | "qualn" | "slayt",
 *                    resonance: number (0-1),
 *                    breakdown?: object
 *                  }>
 *   replaceScope?: boolean  when true, delete existing rounds for
 *                           (user, project) before upserting.
 */
router.post('/score', (req, res) => {
  const { userId, projectId, anchors, replaceScope } = req.body || {};
  if (!userId || !Array.isArray(anchors)) {
    return res
      .status(400)
      .json({ error: 'userId + anchors array required' });
  }

  const conn = db();
  try {
    if (replaceScope) {
      conn
        .prepare(
          `DELETE FROM rounds
           WHERE user_id = ?
             AND (? IS NULL OR project_id = ? OR (project_id IS NULL AND ? IS NULL))`,
        )
        .run(userId, projectId ?? null, projectId ?? null, projectId ?? null);
    }

    const upsert = conn.prepare(`
      INSERT INTO rounds (id, user_id, project_id, anchor_asset_id, anchor_kind, anchor_source_app, resonance_score, breakdown, computed_at)
      VALUES (@id, @user_id, @project_id, @anchor_asset_id, @anchor_kind, @anchor_source_app, @resonance_score, @breakdown, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, project_id, anchor_asset_id) DO UPDATE SET
        anchor_kind = excluded.anchor_kind,
        anchor_source_app = excluded.anchor_source_app,
        resonance_score = excluded.resonance_score,
        breakdown = excluded.breakdown,
        computed_at = CURRENT_TIMESTAMP
    `);

    const upsertMany = conn.transaction((rows) => {
      const ids = [];
      for (const r of rows) {
        if (!r?.assetId || typeof r.resonance !== 'number') continue;
        const id = crypto
          .createHash('sha1')
          .update(`${userId}::${projectId ?? ''}::${r.assetId}`)
          .digest('hex')
          .slice(0, 20);
        upsert.run({
          id,
          user_id: userId,
          project_id: projectId ?? null,
          anchor_asset_id: r.assetId,
          anchor_kind: r.kind || 'unknown',
          anchor_source_app: r.sourceApp || null,
          resonance_score: Math.max(0, Math.min(1, r.resonance)),
          breakdown: JSON.stringify(r.breakdown || {}),
        });
        ids.push(id);
      }
      return ids;
    });

    const ids = upsertMany(anchors);
    res.json({
      success: true,
      userId,
      projectId: projectId ?? null,
      upserted: ids.length,
      skipped: anchors.length - ids.length,
    });
  } finally {
    conn.close();
  }
});

/**
 * DELETE /api/rounds/:userId
 *
 * Clear rounds for a user, optionally scoped to a project. Used to
 * force a full recompute on the next score call.
 */
router.delete('/:userId', (req, res) => {
  const userId = req.params.userId;
  const projectId = req.query.project ?? null;
  const conn = db();
  try {
    const result = conn
      .prepare(
        `DELETE FROM rounds
         WHERE user_id = ?
           AND (? IS NULL OR project_id = ? OR (project_id IS NULL AND ? IS NULL))`,
      )
      .run(userId, projectId, projectId, projectId);
    res.json({ deleted: result.changes, userId, projectId });
  } finally {
    conn.close();
  }
});

module.exports = router;
