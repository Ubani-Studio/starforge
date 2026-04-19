/**
 * Project DNA Scanner Service
 *
 * Reads actual project artifacts (strategy docs, READMEs, package.json)
 * to extract core creative identity. This is the highest-conviction signal
 * in the Taste OS — what someone builds reveals who they truly are.
 *
 * Ported from Folio's projectDNAScanner.ts to Starforge CommonJS.
 */

const { readFile, readdir, stat, writeFile, mkdir, unlink } = require('fs/promises');
const { join, basename, extname } = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');
const axios = require('axios');

// On-disk archive for uploaded source files. Every upload goes here;
// nothing is discarded. Path is content-addressable (sha256 hash) so
// re-uploading the same file is a dedup not a duplicate.
const SOURCES_ROOT = path.resolve(__dirname, '../../uploads/project-dna');

const HOME = process.env.HOME || '/home/user';

// Primary docs — strategy, manifestos (configured via env or discovered during scan)
// Set PROJECT_DNA_DOCS to a comma-separated list of absolute paths
const PRIMARY_DOCS = process.env.PROJECT_DNA_DOCS
  ? process.env.PROJECT_DNA_DOCS.split(',').map(p => p.trim())
  : [];

// Project directories to scan for README + package.json
// Set PROJECT_DNA_DIRS to a comma-separated list of absolute paths
const PROJECT_DIRS = process.env.PROJECT_DNA_DIRS
  ? process.env.PROJECT_DNA_DIRS.split(',').map(p => p.trim())
  : [];

const MAX_FILE_CHARS = 4000;
const MAX_TOTAL_CONTEXT = 40000;

// --- File reading helpers ---

async function safeReadFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    return content.slice(0, MAX_FILE_CHARS);
  } catch {
    return null;
  }
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function scanProjectDir(dir) {
  const name = basename(dir);
  const readme = await safeReadFile(join(dir, 'README.md'))
    || await safeReadFile(join(dir, 'readme.md'));

  let deps = null;
  const pkgPath = join(dir, 'package.json');
  if (await fileExists(pkgPath)) {
    try {
      const raw = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw);
      deps = JSON.stringify({
        name: pkg.name,
        description: pkg.description,
        dependencies: pkg.dependencies ? Object.keys(pkg.dependencies) : [],
        devDependencies: pkg.devDependencies ? Object.keys(pkg.devDependencies).slice(0, 20) : [],
      });
    } catch {
      deps = null;
    }
  }

  return { name, readme, deps };
}

// --- DB setup ---

const DB_PATH = path.join(__dirname, '../../starforge_identity.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_dna (
      user_id TEXT PRIMARY KEY,
      dna_json TEXT NOT NULL,
      scanned_at TEXT NOT NULL,
      sources_scanned INTEGER DEFAULT 0
    );

    -- One-time migration to split canonical ("wall") vs draft ("extract").
    -- Existing rows become the wall (canonical); extract rows are written
    -- by scan and only promoted to wall on explicit save.
  `);

  // Migrate project_dna to composite (user_id, state) PK if we're still on the
  // legacy single-column schema. Idempotent: detected via PRAGMA table_info.
  const cols = db.prepare("PRAGMA table_info(project_dna)").all();
  const hasState = cols.some((c) => c.name === 'state');
  if (!hasState) {
    db.exec(`
      CREATE TABLE project_dna_new (
        user_id TEXT NOT NULL,
        state   TEXT NOT NULL DEFAULT 'wall',
        dna_json TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        sources_scanned INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, state)
      );
      INSERT INTO project_dna_new (user_id, state, dna_json, scanned_at, sources_scanned)
        SELECT user_id, 'wall', dna_json, scanned_at, sources_scanned FROM project_dna;
      DROP TABLE project_dna;
      ALTER TABLE project_dna_new RENAME TO project_dna;
    `);
  }

  // Add baseline_dna_json column for merge-on-promote. Baseline is what
  // the extract looked like the moment it was last promoted to wall. Any
  // divergence between wall and baseline is a user edit; on the next
  // save-to-wall we replay those edits on top of the new extract so user
  // edits carry forward instead of being overwritten.
  //
  // Idempotent: detected via PRAGMA.
  const cols2 = db.prepare("PRAGMA table_info(project_dna)").all();
  const hasBaseline = cols2.some((c) => c.name === 'baseline_dna_json');
  if (!hasBaseline) {
    db.exec(`
      ALTER TABLE project_dna ADD COLUMN baseline_dna_json TEXT;
      UPDATE project_dna SET baseline_dna_json = dna_json WHERE state = 'wall' AND baseline_dna_json IS NULL;
      UPDATE project_dna SET baseline_dna_json = dna_json WHERE state = 'extract' AND baseline_dna_json IS NULL;
    `);
  }

  db.exec(`

    -- Append-only audit log of changes to a user's Project DNA.
    -- Every revise call writes one row here before mutating project_dna,
    -- so terminology drift (StanVault → Imprint, conviction → belief) is
    -- a first-class learnable signal rather than silent overwrite.
    CREATE TABLE IF NOT EXISTS project_dna_revisions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      TEXT    NOT NULL,
      revised_at   TEXT    NOT NULL,
      kind         TEXT    NOT NULL,   -- 'rename' | 'patch' | 'feedback_promotion'
      -- For renames: { path: "tools[0].name", from: "StanVault", to: "Imprint" }
      -- For patches: { path, before, after }
      -- For feedback_promotions: { path, tier, evidence_id, hook_text | script_id }
      change_json  TEXT    NOT NULL,
      evidence     TEXT,               -- free-text or JSON: why this change
      source       TEXT,               -- 'user' | 'hook_save_tier' | 'script_save_tier' | ...
      prev_dna     TEXT    NOT NULL    -- full pre-change DNA JSON for rollback
    );

    CREATE INDEX IF NOT EXISTS idx_pdr_user_revised
      ON project_dna_revisions (user_id, revised_at DESC);

    -- Uploaded source files archive. Files land on disk under
    -- uploads/project-dna/<userId>/<hash>.<ext>; this table is the index.
    -- Dedup key is (user_id, content_hash): uploading the same file twice
    -- just refreshes last_uploaded_at, never duplicates.
    CREATE TABLE IF NOT EXISTS project_dna_sources (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         TEXT    NOT NULL,
      filename        TEXT    NOT NULL,
      content_hash    TEXT    NOT NULL,
      stored_path     TEXT    NOT NULL,
      byte_size       INTEGER NOT NULL,
      kind            TEXT    NOT NULL DEFAULT 'upload', -- 'upload' | 'direction_prompt'
      uploaded_at     TEXT    NOT NULL,
      last_scan_at    TEXT,
      UNIQUE(user_id, content_hash)
    );

    CREATE INDEX IF NOT EXISTS idx_pds_user_uploaded
      ON project_dna_sources (user_id, uploaded_at DESC);
  `);
  return db;
}

// --- Source-file archive helpers ---

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function ensureUserSourceDir(userId) {
  const dir = path.join(SOURCES_ROOT, userId);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Persist a single uploaded file to disk and index it. Dedup by content hash.
 * Returns { id, newlyAdded, storedPath, contentHash, byteSize }.
 */
async function persistSource(userId, filename, content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
  const contentHash = sha256(buf);
  const ext = (extname(filename || '') || '.txt').toLowerCase();
  const dir = await ensureUserSourceDir(userId);
  const storedPath = path.join(dir, `${contentHash}${ext}`);

  await writeFile(storedPath, buf);

  const db = getDb();
  try {
    const now = new Date().toISOString();
    const existing = db
      .prepare('SELECT id FROM project_dna_sources WHERE user_id = ? AND content_hash = ?')
      .get(userId, contentHash);
    if (existing) {
      db.prepare('UPDATE project_dna_sources SET filename = ?, stored_path = ?, last_scan_at = ? WHERE id = ?')
        .run(filename, storedPath, now, existing.id);
      return { id: existing.id, newlyAdded: false, storedPath, contentHash, byteSize: buf.length };
    }
    const info = db
      .prepare(
        `INSERT INTO project_dna_sources
          (user_id, filename, content_hash, stored_path, byte_size, kind, uploaded_at, last_scan_at)
         VALUES (?, ?, ?, ?, ?, 'upload', ?, ?)`,
      )
      .run(userId, filename, contentHash, storedPath, buf.length, now, now);
    return { id: info.lastInsertRowid, newlyAdded: true, storedPath, contentHash, byteSize: buf.length };
  } finally {
    db.close();
  }
}

/**
 * Load every persisted source for a user as { name, content } records.
 * Used by the cumulative scanner so re-uploads extend the corpus rather
 * than replace it.
 */
async function loadAllSources(userId) {
  const db = getDb();
  let rows;
  try {
    rows = db
      .prepare('SELECT * FROM project_dna_sources WHERE user_id = ? ORDER BY uploaded_at ASC')
      .all(userId);
  } finally {
    db.close();
  }
  const out = [];
  for (const r of rows) {
    try {
      const content = await readFile(r.stored_path, 'utf-8');
      out.push({
        id: r.id,
        name: r.filename,
        content,
        contentHash: r.content_hash,
        byteSize: r.byte_size,
        uploadedAt: r.uploaded_at,
      });
    } catch {
      // File missing on disk; skip but leave the index entry for cleanup.
    }
  }
  return out;
}

function listSourceRows(userId) {
  const db = getDb();
  try {
    return db
      .prepare(
        `SELECT id, filename, content_hash, byte_size, kind, uploaded_at, last_scan_at
         FROM project_dna_sources WHERE user_id = ?
         ORDER BY uploaded_at DESC`,
      )
      .all(userId);
  } finally {
    db.close();
  }
}

async function removeSource(userId, sourceId) {
  const db = getDb();
  let row;
  try {
    row = db
      .prepare('SELECT * FROM project_dna_sources WHERE id = ? AND user_id = ?')
      .get(sourceId, userId);
    if (!row) return { removed: false };
    db.prepare('DELETE FROM project_dna_sources WHERE id = ?').run(sourceId);
  } finally {
    db.close();
  }
  try {
    await unlink(row.stored_path);
  } catch { /* already gone */ }
  return { removed: true, filename: row.filename };
}

async function getSource(userId, sourceId) {
  const db = getDb();
  let row;
  try {
    row = db
      .prepare('SELECT * FROM project_dna_sources WHERE id = ? AND user_id = ?')
      .get(sourceId, userId);
  } finally {
    db.close();
  }
  if (!row) return null;
  try {
    const content = await readFile(row.stored_path, 'utf-8');
    return { ...row, content };
  } catch {
    return { ...row, content: null };
  }
}

// --- Revision log helpers ---

/**
 * Apply a patch to a user's Project DNA and record the revision.
 *
 * @param {string} userId
 * @param {{kind: 'rename'|'patch'|'feedback_promotion', change: object,
 *          evidence?: string, source?: string,
 *          mutator: (dna: object) => object}} args
 *   mutator is a pure function that takes the current DNA and returns the
 *   next DNA. Called inside a transaction so revision + mutation are atomic.
 * @returns {{dna: object, revisionId: number}}
 */
function reviseProjectDNA(userId, args) {
  const { kind, change, evidence, source, mutator } = args;
  const db = getDb();
  try {
    const tx = db.transaction(() => {
      // Revise operates on the WALL (canonical). Extract is scan-driven;
      // we wouldn't want a rename applied to extract to be silently undone
      // the next time the corpus rescans.
      const row = db
        .prepare("SELECT dna_json FROM project_dna WHERE user_id = ? AND state = 'wall'")
        .get(userId);
      const prevDna = row ? JSON.parse(row.dna_json) : {};
      const nextDna = mutator(JSON.parse(JSON.stringify(prevDna)));
      const revised = new Date().toISOString();

      const info = db.prepare(`
        INSERT INTO project_dna_revisions (user_id, revised_at, kind, change_json, evidence, source, prev_dna)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        revised,
        kind,
        JSON.stringify(change),
        evidence ?? null,
        source ?? 'user',
        JSON.stringify(prevDna)
      );

      // UPDATE only touches listed columns, so baseline_dna_json is preserved.
      // Using INSERT OR REPLACE here would wipe baseline to NULL and break
      // the merge-on-promote path. If the wall row doesn't exist, we fall
      // back to an INSERT that explicitly sets baseline to the new dna
      // (bootstrap case: this is the first time the wall is populated via
      // revise, which shouldn't normally happen but is handled safely).
      const upd = db.prepare(`
        UPDATE project_dna
           SET dna_json = ?, scanned_at = ?
         WHERE user_id = ? AND state = 'wall'
      `).run(JSON.stringify(nextDna), revised, userId);
      if (upd.changes === 0) {
        db.prepare(`
          INSERT INTO project_dna (user_id, state, dna_json, scanned_at, sources_scanned, baseline_dna_json)
          VALUES (?, 'wall', ?, ?, 0, ?)
        `).run(userId, JSON.stringify(nextDna), revised, JSON.stringify(nextDna));
      }

      return { dna: nextDna, revisionId: info.lastInsertRowid };
    });
    return tx();
  } finally {
    db.close();
  }
}

/**
 * List revisions for a user, newest first. Limited to avoid dumping full
 * history when the caller only needs the latest.
 */
function listRevisions(userId, limit = 50) {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT id, revised_at, kind, change_json, evidence, source
      FROM project_dna_revisions
      WHERE user_id = ?
      ORDER BY revised_at DESC
      LIMIT ?
    `).all(userId, limit);
    return rows.map(r => ({
      id: r.id,
      revisedAt: r.revised_at,
      kind: r.kind,
      change: JSON.parse(r.change_json),
      evidence: r.evidence,
      source: r.source,
    }));
  } finally {
    db.close();
  }
}

/**
 * Apply a rename by path within the DNA JSON. Supports dotted paths like
 * "tools[0].name" or "cultural_lineage.ancestors[2]".
 *
 * Inline-atomic because we need to read the previous value mid-mutation
 * (to record `from` in the change log), which the generic reviseProjectDNA
 * mutator signature doesn't expose cleanly.
 */
function renameByPath(userId, path, to, evidence, source) {
  const db = getDb();
  try {
    const tx = db.transaction(() => {
      const row = db
        .prepare("SELECT dna_json FROM project_dna WHERE user_id = ? AND state = 'wall'")
        .get(userId);
      if (!row) throw new Error(`No project_dna wall for user ${userId}`);
      const prevDna = JSON.parse(row.dna_json);
      const nextDna = JSON.parse(JSON.stringify(prevDna));
      const { from } = setByPath(nextDna, path, to);
      const revised = new Date().toISOString();

      const info = db.prepare(`
        INSERT INTO project_dna_revisions (user_id, revised_at, kind, change_json, evidence, source, prev_dna)
        VALUES (?, ?, 'rename', ?, ?, ?, ?)
      `).run(
        userId,
        revised,
        JSON.stringify({ path, from, to }),
        evidence ?? null,
        source ?? 'user',
        JSON.stringify(prevDna)
      );

      // UPDATE preserves baseline_dna_json so merge-on-promote can still
      // detect this as a user edit at the next save-to-wall.
      db.prepare(`
        UPDATE project_dna
           SET dna_json = ?, scanned_at = ?
         WHERE user_id = ? AND state = 'wall'
      `).run(JSON.stringify(nextDna), revised, userId);

      return { dna: nextDna, revisionId: info.lastInsertRowid, from };
    });
    return tx();
  } finally {
    db.close();
  }
}

/**
 * Path resolver: supports dotted access with [idx] array segments.
 * Returns { from, parent, key } — `from` is the previous value at path.
 * Throws if any intermediate segment doesn't exist.
 */
function setByPath(obj, path, newValue) {
  const parts = path
    .split('.')
    .flatMap((seg) => {
      const out = [];
      const rx = /([^\[\]]+)|\[(\d+)\]/g;
      let m;
      while ((m = rx.exec(seg)) !== null) {
        out.push(m[1] ?? Number(m[2]));
      }
      return out;
    });
  if (parts.length === 0) throw new Error('Empty path');

  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur == null || !(p in cur)) {
      throw new Error(`Path segment "${p}" not found while traversing "${path}"`);
    }
    cur = cur[p];
  }
  const last = parts[parts.length - 1];
  const from = cur[last];
  cur[last] = newValue;
  return { from, parent: cur, key: last };
}

// --- Main scanner ---

async function scanProjectDNA() {
  const sourcesScanned = [];
  const contextParts = [];
  let totalChars = 0;

  // 1. Read primary docs
  for (const docPath of PRIMARY_DOCS) {
    const content = await safeReadFile(docPath);
    if (content) {
      const label = docPath.replace(HOME, '~');
      sourcesScanned.push(label);
      const part = `\n--- ${label} ---\n${content}`;
      if (totalChars + part.length < MAX_TOTAL_CONTEXT) {
        contextParts.push(part);
        totalChars += part.length;
      }
    }
  }

  // 2. Scan project directories
  for (const dir of PROJECT_DIRS) {
    if (!(await fileExists(dir))) continue;
    const project = await scanProjectDir(dir);
    sourcesScanned.push(`~/${project.name}/`);

    let part = `\n--- Project: ${project.name} ---`;
    if (project.deps) part += `\nDependencies: ${project.deps}`;
    if (project.readme) part += `\nREADME:\n${project.readme}`;

    if (totalChars + part.length < MAX_TOTAL_CONTEXT) {
      contextParts.push(part);
      totalChars += part.length;
    }
  }

  const projectContext = contextParts.join('\n');

  // 3. Extract identity via Claude
  return extractIdentityFromContext(projectContext, sourcesScanned);
}

// --- DB persistence ---

async function scanAndSave(userId = 'default') {
  const projectDNA = await scanProjectDNA();
  writeExtractAndBootstrapWall(userId, projectDNA, projectDNA.sourcesScanned.length);
  return projectDNA;
}

/**
 * Shared write-path for every scan result. Writes to state='extract' and,
 * if no wall exists yet for this user, also bootstraps the wall so
 * downstream readers see something immediately. Subsequent scans only
 * touch extract; promotion to wall is explicit via saveExtractToWall.
 *
 * On bootstrap the wall baseline is set to the same DNA as the wall
 * itself, representing "no user edits yet." On subsequent scans the
 * extract row's baseline is also kept in sync with its own dna_json
 * (the baseline concept is only load-bearing on the wall row, but
 * populating it on extract keeps downstream readers consistent).
 */
function writeExtractAndBootstrapWall(userId, projectDNA, corpusSize) {
  const db = getDb();
  try {
    const dnaJson = JSON.stringify(projectDNA);
    const scannedAt = projectDNA.scannedAt ?? new Date().toISOString();

    db.prepare(
      `INSERT OR REPLACE INTO project_dna (user_id, state, dna_json, scanned_at, sources_scanned, baseline_dna_json)
       VALUES (?, 'extract', ?, ?, ?, ?)`,
    ).run(userId, dnaJson, scannedAt, corpusSize, dnaJson);

    const wall = db
      .prepare("SELECT 1 as ok FROM project_dna WHERE user_id = ? AND state = 'wall'")
      .get(userId);
    if (!wall) {
      db.prepare(
        `INSERT OR REPLACE INTO project_dna (user_id, state, dna_json, scanned_at, sources_scanned, baseline_dna_json)
         VALUES (?, 'wall', ?, ?, ?, ?)`,
      ).run(userId, dnaJson, scannedAt, corpusSize, dnaJson);
    }
  } finally {
    db.close();
  }
}

/**
 * Merge user edits from the current wall onto a new extract. The "user
 * edits" are whatever the current wall has that the baseline does not
 * (where baseline = the extract at the last time save-to-wall was
 * pressed). For each edit we know whether it was a scalar change, an
 * array add, or an array remove, and we replay those on the new extract.
 *
 * Fields covered (the ones surfaced in the UI):
 *   - coreIdentity.thesis                (scalar)
 *   - tone.register                      (scalar)
 *   - coreIdentity.domains               (array-of-strings)
 *   - coreIdentity.tools                 (array-of-strings)
 *   - coreIdentity.antiTaste             (array-of-strings)
 *   - expansionVectors.gaps              (array-of-strings)
 *
 * Returns: { merged, editsReplayed: { scalars, adds, removes } }
 *
 * Fields outside the covered set take the new extract's value as-is.
 */
function mergeWallEditsOntoExtract(newExtract, currentWall, baseline) {
  const merged = JSON.parse(JSON.stringify(newExtract || {}));
  const wall = currentWall || {};
  const base = baseline || {};
  let scalars = 0;
  let adds = 0;
  let removes = 0;

  const scalarSpecs = [
    ['coreIdentity', 'thesis'],
    ['tone', 'register'],
  ];
  for (const [parent, key] of scalarSpecs) {
    const w = wall?.[parent]?.[key];
    const b = base?.[parent]?.[key];
    if (w !== undefined && w !== b) {
      if (!merged[parent]) merged[parent] = {};
      merged[parent][key] = w;
      scalars += 1;
    }
  }

  const arraySpecs = [
    ['coreIdentity', 'domains'],
    ['coreIdentity', 'tools'],
    ['coreIdentity', 'antiTaste'],
    ['expansionVectors', 'gaps'],
  ];
  for (const [parent, key] of arraySpecs) {
    const wArr = Array.isArray(wall?.[parent]?.[key]) ? wall[parent][key] : [];
    const bArr = Array.isArray(base?.[parent]?.[key]) ? base[parent][key] : [];
    const eArr = Array.isArray(merged?.[parent]?.[key]) ? merged[parent][key] : [];

    const bKeys = new Set(bArr.map((x) => typeof x === 'string' ? x : JSON.stringify(x)));
    const wKeys = new Set(wArr.map((x) => typeof x === 'string' ? x : JSON.stringify(x)));

    const userRemoved = bArr.filter((x) => {
      const k = typeof x === 'string' ? x : JSON.stringify(x);
      return !wKeys.has(k);
    });
    const userRemovedKeys = new Set(userRemoved.map((x) => typeof x === 'string' ? x : JSON.stringify(x)));

    const userAdded = wArr.filter((x) => {
      const k = typeof x === 'string' ? x : JSON.stringify(x);
      return !bKeys.has(k);
    });

    // Start from extract, drop anything user removed, then append user-added
    // items that aren't already present. Preserves extract ordering for
    // items the extractor still surfaces; user-adds land at the end.
    const result = eArr.filter((x) => {
      const k = typeof x === 'string' ? x : JSON.stringify(x);
      return !userRemovedKeys.has(k);
    });
    removes += userRemoved.length;
    for (const item of userAdded) {
      const k = typeof item === 'string' ? item : JSON.stringify(item);
      const present = result.some((x) => (typeof x === 'string' ? x : JSON.stringify(x)) === k);
      if (!present) {
        result.push(item);
        adds += 1;
      }
    }

    if (!merged[parent]) merged[parent] = {};
    merged[parent][key] = result;
  }

  return { merged, editsReplayed: { scalars, adds, removes } };
}

/**
 * Read Project DNA. Default is the canonical 'wall'; pass state='extract'
 * for the in-progress draft. When no state given, prefer wall, fall back
 * to extract (so first-time users whose extract hasn't been promoted yet
 * still get something).
 */
function getProjectDNA(userId = 'default', state = null) {
  try {
    const db = getDb();
    let row;
    if (state === 'extract' || state === 'wall') {
      row = db.prepare('SELECT dna_json FROM project_dna WHERE user_id = ? AND state = ?').get(userId, state);
    } else {
      row = db.prepare("SELECT dna_json FROM project_dna WHERE user_id = ? AND state = 'wall'").get(userId)
        ?? db.prepare("SELECT dna_json FROM project_dna WHERE user_id = ? AND state = 'extract'").get(userId);
    }
    db.close();
    if (!row) return null;
    return JSON.parse(row.dna_json);
  } catch {
    return null;
  }
}

/**
 * Whether the user has a distinct extract that has NOT yet been promoted
 * to wall, AND whether the current wall has user edits that haven't been
 * reconciled with the baseline. Used to surface save-to-wall state and
 * the "wall has pending edits" banner in the UI.
 */
function hasPendingExtract(userId = 'default') {
  const db = getDb();
  try {
    const ex = db
      .prepare("SELECT scanned_at, dna_json FROM project_dna WHERE user_id = ? AND state = 'extract'")
      .get(userId);
    if (!ex) return { pending: false, wallEdited: false };
    const wall = db
      .prepare("SELECT scanned_at, dna_json, baseline_dna_json FROM project_dna WHERE user_id = ? AND state = 'wall'")
      .get(userId);
    if (!wall) {
      return {
        pending: true,
        reason: 'no_wall_yet',
        extractScannedAt: ex.scanned_at,
        wallEdited: false,
      };
    }
    const extractChanged = wall.dna_json !== ex.dna_json;
    const wallEdited = !!wall.baseline_dna_json && wall.dna_json !== wall.baseline_dna_json;
    return {
      pending: extractChanged,
      reason: extractChanged ? 'extract_newer_than_wall' : 'in_sync',
      extractScannedAt: ex.scanned_at,
      wallScannedAt: wall.scanned_at,
      wallEdited,
    };
  } finally {
    db.close();
  }
}

/**
 * Promote the current extract row to wall. User edits on the wall
 * (anywhere the wall differs from its baseline) are replayed onto the
 * new extract so they carry forward. Old wall is snapshotted to
 * project_dna_revisions with kind='wall_save' for rollback.
 *
 * After promotion, the new baseline is set to the new extract itself:
 * any subsequent wall edits drift from that baseline, and the next
 * promotion merges them forward too.
 */
function saveExtractToWall(userId, note = null) {
  const db = getDb();
  try {
    const extract = db
      .prepare("SELECT * FROM project_dna WHERE user_id = ? AND state = 'extract'")
      .get(userId);
    if (!extract) throw new Error('No extract to save');

    const oldWall = db
      .prepare("SELECT * FROM project_dna WHERE user_id = ? AND state = 'wall'")
      .get(userId);

    const revisedAt = new Date().toISOString();

    let wallDna = extract.dna_json;
    let editsReplayed = { scalars: 0, adds: 0, removes: 0 };

    if (oldWall?.dna_json) {
      const extractJson = (() => { try { return JSON.parse(extract.dna_json); } catch { return null; } })();
      const wallJson = (() => { try { return JSON.parse(oldWall.dna_json); } catch { return null; } })();
      const baselineJson = (() => {
        try {
          return JSON.parse(oldWall.baseline_dna_json || oldWall.dna_json);
        } catch {
          return null;
        }
      })();

      if (extractJson && wallJson && baselineJson) {
        const mergeResult = mergeWallEditsOntoExtract(extractJson, wallJson, baselineJson);
        wallDna = JSON.stringify(mergeResult.merged);
        editsReplayed = mergeResult.editsReplayed;
      }

      db.prepare(
        `INSERT INTO project_dna_revisions
          (user_id, revised_at, kind, change_json, evidence, source, prev_dna)
         VALUES (?, ?, 'wall_save', ?, ?, 'user', ?)`,
      ).run(
        userId,
        revisedAt,
        JSON.stringify({
          reason: 'save extract to wall',
          prevScannedAt: oldWall.scanned_at,
          editsReplayed,
        }),
        note,
        oldWall.dna_json,
      );
    }

    db.prepare(
      `INSERT OR REPLACE INTO project_dna
        (user_id, state, dna_json, scanned_at, sources_scanned, baseline_dna_json)
       VALUES (?, 'wall', ?, ?, ?, ?)`,
    ).run(userId, wallDna, extract.scanned_at, extract.sources_scanned, extract.dna_json);

    return {
      promoted: true,
      promotedAt: revisedAt,
      wasBootstrap: !oldWall,
      editsReplayed,
    };
  } finally {
    db.close();
  }
}

/**
 * Get Project DNA, auto-scanning once if no cached data exists.
 * This avoids burning API credits on every request — scans once, caches forever
 * until manually refreshed via POST /scan.
 */
let autoScanPromise = null;
async function getOrScanProjectDNA(userId = 'default') {
  const cached = getProjectDNA(userId);
  if (cached) return cached;

  // No cached data — trigger a one-time scan (deduplicated)
  if (!autoScanPromise) {
    console.log('Project DNA not cached — running one-time auto-scan...');
    autoScanPromise = scanAndSave(userId)
      .then(result => { autoScanPromise = null; return result; })
      .catch(err => { autoScanPromise = null; console.error('Auto-scan failed:', err.message); return null; });
  }
  return autoScanPromise;
}

// --- Scan from uploaded files (for other users) ---

async function extractIdentityFromContext(projectContext, sourcesScanned) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are analyzing a creator's actual project artifacts to extract their CORE IDENTITY. This is the highest-fidelity taste signal possible — what someone builds reveals who they truly are.

PROJECT ARTIFACTS:
${projectContext}

---

Extract the creator's identity from these artifacts. Be SPECIFIC and CONCRETE — use actual project names, actual tools, actual references found in the documents. Do not generalize.

Return ONLY valid JSON:
{
  "coreIdentity": {
    "thesis": "One sentence: what they are fundamentally building across all projects",
    "domains": ["3-7 specific domains they work in, e.g. 'conviction intelligence for music', not just 'tech'"],
    "tools": ["Actual tools/frameworks found in their projects"],
    "references": ["Actual people, books, traditions they cite — e.g. 'Eglash (African Fractals)', 'Gerdes (Lunda Geometry)'"],
    "antiTaste": ["Things they explicitly reject or position against — extract from strategy docs, naming, architecture decisions"]
  },
  "expansionVectors": {
    "lineage": ["Reference -> where it could lead next. e.g. 'Kentridge (erasure as memory) -> temporal decay visualization'"],
    "gaps": ["What's missing across their ecosystem — things they've planned but not built, or logical next steps"]
  },
  "tone": {
    "register": "One phrase describing their communication register, e.g. 'architectural-academic with cultural grounding'",
    "vocabulary": ["10-15 key terms that define their voice — words they use repeatedly across docs"],
    "preserveTerms": ["Terms that should NEVER be simplified or translated — domain-specific, culturally specific, or coined terms"]
  }
}

RULES:
- Base EVERYTHING on the actual artifacts. Do not invent or assume.
- "antiTaste" = things they explicitly position against (e.g., "post-vanity" means anti-engagement-metrics)
- "preserveTerms" = words like "lusona", "veve", "conviction", "provenance" that carry specific meaning
- "tools" = actual technologies found in package.json or source code (Max/MSP, gen~, TouchDesigner, RAVE, Solidity, etc.)
- "references" = actual people/works cited, not generic influences
- Return ONLY valid JSON, no markdown wrapping`
    }],
  }, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
  });

  const text = response.data.content[0].text;
  const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(jsonStr);

  return {
    ...parsed,
    confidence: 1.0,
    scannedAt: new Date().toISOString(),
    sourcesScanned,
  };
}

/**
 * Scan from uploaded files (for users who upload their project files).
 * @param {Array<{name: string, content: string}>} files - uploaded file contents
 * @param {string} direction - optional user-provided brief about who they are
 */
async function scanFromUploadedFiles(files, direction = '') {
  const contextParts = [];
  const sourcesScanned = [];
  let totalChars = 0;

  if (direction) {
    const part = `\n--- Creator Direction ---\n${direction}`;
    contextParts.push(part);
    totalChars += part.length;
    sourcesScanned.push('direction_prompt');
  }

  for (const file of files) {
    const content = file.content.slice(0, MAX_FILE_CHARS);
    const part = `\n--- ${file.name} ---\n${content}`;
    if (totalChars + part.length < MAX_TOTAL_CONTEXT) {
      contextParts.push(part);
      totalChars += part.length;
      sourcesScanned.push(file.name);
    }
  }

  if (sourcesScanned.length === 0) {
    throw new Error('No readable files provided');
  }

  return extractIdentityFromContext(contextParts.join('\n'), sourcesScanned);
}

/**
 * Scan a user-provided directory for project artifacts.
 * @param {string} basePath - root directory to scan
 * @param {number} maxDepth - how deep to recurse (default 2)
 */
async function scanDirectory(basePath, maxDepth = 2) {
  const contextParts = [];
  const sourcesScanned = [];
  let totalChars = 0;

  async function scanDir(dir, depth) {
    if (depth > maxDepth || totalChars >= MAX_TOTAL_CONTEXT) return;

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    // Scan known files in this directory
    const project = await scanProjectDir(dir);
    if (project.readme || project.deps) {
      const label = dir.replace(HOME, '~');
      sourcesScanned.push(label);
      let part = `\n--- Project: ${project.name} ---`;
      if (project.deps) part += `\nDependencies: ${project.deps}`;
      if (project.readme) part += `\nREADME:\n${project.readme}`;

      if (totalChars + part.length < MAX_TOTAL_CONTEXT) {
        contextParts.push(part);
        totalChars += part.length;
      }
    }

    // Also read .md and strategy docs at this level
    for (const entry of entries) {
      if (entry.isFile() && /\.(md|txt)$/i.test(entry.name) && entry.name.toLowerCase() !== 'readme.md') {
        const content = await safeReadFile(join(dir, entry.name));
        if (content) {
          const label = join(dir, entry.name).replace(HOME, '~');
          sourcesScanned.push(label);
          const part = `\n--- ${label} ---\n${content}`;
          if (totalChars + part.length < MAX_TOTAL_CONTEXT) {
            contextParts.push(part);
            totalChars += part.length;
          }
        }
      }
    }

    // Recurse into subdirectories (skip node_modules, .git, etc.)
    const skipDirs = new Set(['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.venv', 'venv']);
    for (const entry of entries) {
      if (entry.isDirectory() && !skipDirs.has(entry.name) && !entry.name.startsWith('.')) {
        await scanDir(join(dir, entry.name), depth + 1);
      }
    }
  }

  await scanDir(basePath, 0);

  if (sourcesScanned.length === 0) {
    throw new Error('No project artifacts found in directory');
  }

  return extractIdentityFromContext(contextParts.join('\n'), sourcesScanned);
}

/**
 * Scan from uploaded files and save to DB — cumulative and non-destructive.
 *
 * Every incoming file is archived to disk (dedup by content hash) and
 * indexed in project_dna_sources. The scan then runs against the
 * FULL corpus of all sources ever uploaded by this user, plus the
 * current direction prompt. The resulting DNA is written to project_dna
 * but the prior DNA is first snapshotted into project_dna_revisions so
 * nothing is lost.
 *
 * Re-uploading the same file is idempotent (hash dedup). Uploading a
 * new file adds to the corpus. Never overwrites the archive.
 */
async function scanUploadedAndSave(userId, files, direction) {
  // 1. Archive every file and index it. Hash dedup means re-uploads refresh.
  let newlyAdded = 0;
  for (const file of files) {
    const res = await persistSource(userId, file.name, file.content);
    if (res.newlyAdded) newlyAdded += 1;
  }

  // 2. Load the cumulative corpus (all sources, newest + oldest).
  const corpus = await loadAllSources(userId);

  if (corpus.length === 0) {
    throw new Error('No readable files in the corpus');
  }

  // 3. Re-extract identity against the full corpus + direction.
  const projectDNA = await scanFromUploadedFiles(corpus, direction);

  // 4. Snapshot the prior EXTRACT before overwriting (wall is not
  //    touched here; user must explicitly Save to Wall to promote).
  const db = getDb();
  try {
    const priorExtract = db
      .prepare("SELECT dna_json FROM project_dna WHERE user_id = ? AND state = 'extract'")
      .get(userId);
    if (priorExtract?.dna_json) {
      db.prepare(
        `INSERT INTO project_dna_revisions
          (user_id, revised_at, kind, change_json, evidence, source, prev_dna)
         VALUES (?, ?, 'extract_update', ?, ?, 'upload', ?)`,
      ).run(
        userId,
        projectDNA.scannedAt,
        JSON.stringify({
          reason: 'cumulative rescan after upload',
          filesAdded: newlyAdded,
          corpusSize: corpus.length,
        }),
        direction || null,
        priorExtract.dna_json,
      );
    }
  } finally {
    db.close();
  }

  // 5. Write to extract. If no wall exists yet, bootstrap it too.
  writeExtractAndBootstrapWall(userId, projectDNA, corpus.length);

  return {
    ...projectDNA,
    corpusSize: corpus.length,
    newlyAdded,
  };
}

/**
 * Remove a source file and re-extract against the remaining corpus.
 * Prior DNA is snapshotted to revisions before the rescan, same as
 * scanUploadedAndSave.
 */
async function removeSourceAndRescan(userId, sourceId) {
  const res = await removeSource(userId, sourceId);
  if (!res.removed) return { removed: false };

  const corpus = await loadAllSources(userId);
  if (corpus.length === 0) {
    // Corpus went to zero. Archive both extract and wall, then clear both.
    const db = getDb();
    try {
      const rows = db
        .prepare("SELECT state, dna_json FROM project_dna WHERE user_id = ?")
        .all(userId);
      for (const r of rows) {
        db.prepare(
          `INSERT INTO project_dna_revisions
            (user_id, revised_at, kind, change_json, evidence, source, prev_dna)
           VALUES (?, ?, ?, ?, ?, 'source_removed', ?)`,
        ).run(
          userId,
          new Date().toISOString(),
          r.state === 'wall' ? 'wall_cleared' : 'extract_cleared',
          JSON.stringify({ reason: 'final source removed', removedFilename: res.filename }),
          null,
          r.dna_json,
        );
      }
      db.prepare('DELETE FROM project_dna WHERE user_id = ?').run(userId);
    } finally {
      db.close();
    }
    return { removed: true, corpusSize: 0, rescanned: false };
  }

  const projectDNA = await scanFromUploadedFiles(corpus, '');

  // Snapshot prior extract before the rescan overwrites it. Wall is not
  // touched here; removing a source only updates the extract draft.
  const db = getDb();
  try {
    const priorExtract = db
      .prepare("SELECT dna_json FROM project_dna WHERE user_id = ? AND state = 'extract'")
      .get(userId);
    if (priorExtract?.dna_json) {
      db.prepare(
        `INSERT INTO project_dna_revisions
          (user_id, revised_at, kind, change_json, evidence, source, prev_dna)
         VALUES (?, ?, 'extract_update', ?, ?, 'source_removed', ?)`,
      ).run(
        userId,
        projectDNA.scannedAt,
        JSON.stringify({
          reason: 'rescan after source removal',
          removedFilename: res.filename,
          corpusSize: corpus.length,
        }),
        null,
        priorExtract.dna_json,
      );
    }
  } finally {
    db.close();
  }

  writeExtractAndBootstrapWall(userId, projectDNA, corpus.length);

  return { removed: true, corpusSize: corpus.length, rescanned: true, dna: projectDNA };
}

/**
 * Scan a directory and save to DB.
 */
async function scanDirectoryAndSave(userId, dirPath) {
  const projectDNA = await scanDirectory(dirPath);

  const db = getDb();
  writeExtractAndBootstrapWall(userId, projectDNA, projectDNA.sourcesScanned.length);
  return projectDNA;
}

module.exports = {
  scanProjectDNA,
  scanAndSave,
  getProjectDNA,
  getOrScanProjectDNA,
  scanFromUploadedFiles,
  scanDirectory,
  scanUploadedAndSave,
  scanDirectoryAndSave,
  // Extract / Wall state lifecycle
  hasPendingExtract,
  saveExtractToWall,
  writeExtractAndBootstrapWall,
  // Revision log + feedback API
  reviseProjectDNA,
  listRevisions,
  renameByPath,
  // Source-file archive (cumulative upload lifecycle)
  persistSource,
  loadAllSources,
  listSourceRows,
  removeSource,
  removeSourceAndRescan,
  getSource,
};
