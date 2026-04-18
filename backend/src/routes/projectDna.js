/**
 * Project DNA Routes
 *
 * POST /scan                     Trigger auto-scan of local project directories
 * POST /upload-and-scan          Upload files + optional direction; cumulative rescan
 * POST /scan-directory           Scan a user-provided directory path
 * GET  /:userId                  Return cached Project DNA
 *
 * Source archive (cumulative upload lifecycle):
 * GET    /sources/:userId             List all persisted source files
 * GET    /sources/:userId/:id         Fetch one source with its content
 * DELETE /sources/:userId/:id         Remove a source and re-extract the corpus
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { readFile } = require('fs/promises');
const path = require('path');
const projectDnaService = require('../services/projectDnaService');

// Multer config — store uploads in memory (text files only, small)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 30 }, // 5MB per file, max 30 files
  fileFilter: (req, file, cb) => {
    const allowed = /\.(md|txt|json|ts|tsx|js|jsx|py|toml|yaml|yml|cfg|ini|rst|csv)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(null, false); // skip non-text files silently
    }
  },
});

// Trigger auto-scan of local project directories
router.post('/scan', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    console.log(`[Project DNA] Auto-scanning for user: ${userId}`);

    const result = await projectDnaService.scanAndSave(userId);

    res.json({
      success: true,
      projectDNA: result,
      sourcesScanned: result.sourcesScanned.length,
    });
  } catch (error) {
    console.error('[Project DNA] Scan failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Upload files + optional direction prompt → extract identity
router.post('/upload-and-scan', upload.array('files', 30), async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const direction = req.body.direction || '';

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded. Upload .md, .json, .ts, .js, .py, or other text files.',
      });
    }

    console.log(`[Project DNA] Upload scan for user: ${userId}, ${req.files.length} files`);

    // Convert multer files to {name, content} array
    const files = req.files.map(f => ({
      name: f.originalname,
      content: f.buffer.toString('utf-8'),
    }));

    const result = await projectDnaService.scanUploadedAndSave(userId, files, direction);

    res.json({
      success: true,
      projectDNA: result,
      sourcesScanned: result.sourcesScanned.length,
    });
  } catch (error) {
    console.error('[Project DNA] Upload scan failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Scan a user-provided directory path
router.post('/scan-directory', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const dirPath = req.body.path;

    if (!dirPath) {
      return res.status(400).json({
        success: false,
        error: 'Missing "path" field. Provide the directory to scan.',
      });
    }

    console.log(`[Project DNA] Directory scan for user: ${userId}, path: ${dirPath}`);

    const result = await projectDnaService.scanDirectoryAndSave(userId, dirPath);

    res.json({
      success: true,
      projectDNA: result,
      sourcesScanned: result.sourcesScanned.length,
    });
  } catch (error) {
    console.error('[Project DNA] Directory scan failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ─── Source archive (cumulative upload lifecycle) ─────────────────────────

// List all persisted source files for this user.
router.get('/sources/:userId', (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const sources = projectDnaService.listSourceRows(userId);
    res.json({ success: true, sources });
  } catch (error) {
    console.error('[Project DNA] List sources failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch one source with its content.
router.get('/sources/:userId/:id', async (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const id = Number(req.params.id);
    const src = await projectDnaService.getSource(userId, id);
    if (!src) return res.status(404).json({ success: false, error: 'source not found' });
    res.json({ success: true, source: src });
  } catch (error) {
    console.error('[Project DNA] Get source failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove a source and re-extract against the remaining corpus.
// Prior DNA snapshots to project_dna_revisions before the rescan.
router.delete('/sources/:userId/:id', async (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const id = Number(req.params.id);
    const result = await projectDnaService.removeSourceAndRescan(userId, id);
    if (!result.removed) return res.status(404).json({ success: false, error: 'source not found' });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Project DNA] Remove source failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cached Project DNA
router.get('/:userId', (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const projectDNA = projectDnaService.getProjectDNA(userId);

    if (!projectDNA) {
      return res.status(404).json({
        success: false,
        error: 'No Project DNA found. Run a scan first.',
      });
    }

    res.json({
      success: true,
      projectDNA,
    });
  } catch (error) {
    console.error('[Project DNA] Get failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ─── Revision log + feedback endpoints ────────────────────────────────────

/**
 * POST /:userId/rename
 * Body: { path, to, evidence?, source? }
 * Renames a value at a dotted path within the user's Project DNA and
 * writes a revision-log row so the change is learnable.
 *
 * Example:
 *   POST /api/project-dna/default/rename
 *   { "path": "tools[0].name", "to": "Imprint",
 *     "evidence": "Renamed from StanVault — scope evolved to identity verification." }
 */
router.post('/:userId/rename', (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const { path: dnaPath, to, evidence, source } = req.body ?? {};
    if (!dnaPath || to === undefined) {
      return res.status(400).json({ success: false, error: 'path and to are required' });
    }
    const result = projectDnaService.renameByPath(userId, dnaPath, to, evidence, source);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Project DNA] Rename failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /:userId/revise
 * Body: { kind: 'patch'|'feedback_promotion', path, value, evidence?, source? }
 *
 * Writes `value` at `path` (creating intermediate objects/arrays as needed)
 * and logs a revision. Used by qualn's Discover tier saves: Canon and
 * Ancestor ratings post here with { kind: 'feedback_promotion',
 * source: 'hook_save_tier', evidence: <hook text> }.
 */
router.post('/:userId/revise', (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const { kind = 'patch', path: dnaPath, value, evidence, source } = req.body ?? {};
    if (!dnaPath || value === undefined) {
      return res.status(400).json({ success: false, error: 'path and value are required' });
    }
    if (!['patch', 'feedback_promotion'].includes(kind)) {
      return res.status(400).json({
        success: false,
        error: `kind must be 'patch' or 'feedback_promotion', got ${kind}`,
      });
    }
    const result = projectDnaService.reviseProjectDNA(userId, {
      kind,
      source,
      evidence,
      change: { path: dnaPath, value },
      mutator: (dna) => { setByPathCreate(dna, dnaPath, value); return dna; },
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Project DNA] Revise failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /:userId/revisions?limit=50
 * Returns the revision log, newest first.
 */
router.get('/:userId/revisions', (req, res) => {
  try {
    const userId = req.params.userId || 'default';
    const limit = Math.min(500, parseInt(req.query.limit, 10) || 50);
    const revisions = projectDnaService.listRevisions(userId, limit);
    res.json({ success: true, revisions });
  } catch (error) {
    console.error('[Project DNA] List revisions failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Local helper — path setter that creates missing nested structure as it
// traverses. Two extensions over plain lookup:
//   • `[+]` at any array position means "append" — the index is computed
//     from the array's current length. Used by feedback_promotion so Canon
//     and Ancestor saves accumulate rather than overwrite.
//   • Missing intermediate segments are created (objects or arrays as the
//     next segment implies).
function setByPathCreate(obj, p, value) {
  const parts = String(p)
    .split('.')
    .flatMap((seg) => {
      const out = [];
      const rx = /([^\[\]]+)|\[(\+|\d+)\]/g;
      let m;
      while ((m = rx.exec(seg)) !== null) {
        if (m[1] != null) out.push(m[1]);
        else if (m[2] === '+') out.push({ append: true });
        else out.push(Number(m[2]));
      }
      return out;
    });

  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = parts[i + 1];
    const needsArray = typeof next === 'number' || (next && next.append);
    if (part && typeof part === 'object' && part.append) {
      // Intermediate append doesn't make sense — treat as error fallback.
      throw new Error(`Intermediate "[+]" not supported in path "${p}"`);
    }
    if (cur[part] == null) cur[part] = needsArray ? [] : {};
    cur = cur[part];
  }

  const last = parts[parts.length - 1];
  if (last && typeof last === 'object' && last.append) {
    if (!Array.isArray(cur)) {
      throw new Error(`Path ends in [+] but target is not an array: "${p}"`);
    }
    cur.push(value);
  } else {
    cur[last] = value;
  }
}

module.exports = router;
