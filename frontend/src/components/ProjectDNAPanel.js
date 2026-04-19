import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

/**
 * Project DNA Panel — Sources / Extract / Wall
 *
 * Three-tab lifecycle mirroring the backend split:
 *   Sources  — every uploaded file, archived on disk, additive. Drag new
 *              files to grow the corpus; nothing ever overwrites.
 *   Extract  — the live draft of the extracted identity. Rewritten on
 *              every scan. Review before promoting.
 *   Wall     — the canonical DNA. Downstream consumers read this.
 *              Updates only when the user explicitly saves Extract to Wall.
 *
 * Pantheon reference (the 12 archetypes) lives in subtaste-twelve's web
 * UI. This panel links out rather than duplicating the reference.
 */

const SUBTASTE_TWELVE_ARCHETYPES_URL = 'http://localhost:3005/archetypes';

const ProjectDNAPanel = ({ embedded = false, onScanComplete, userId = 'default' }) => {
  const [activeTab, setActiveTab] = useState('sources');
  const [sourcesMode, setSourcesMode] = useState('upload'); // upload | directory

  // Sources state
  const [pendingFiles, setPendingFiles] = useState([]);
  const [direction, setDirection] = useState('');
  const [dirPath, setDirPath] = useState('');
  const [archivedSources, setArchivedSources] = useState([]);

  // Extract + Wall state (fetched)
  const [extractDna, setExtractDna] = useState(null);
  const [wallDna, setWallDna] = useState(null);
  const [pending, setPending] = useState({ pending: false, reason: null });
  const [revisions, setRevisions] = useState([]);

  // Interaction state
  const [scanning, setScanning] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // ───── Data fetchers ─────

  const fetchSources = useCallback(async () => {
    try {
      const r = await axios.get(`/api/project-dna/sources/${userId}`);
      if (r.data.success) setArchivedSources(r.data.sources || []);
    } catch {
      setArchivedSources([]);
    }
  }, [userId]);

  const fetchDna = useCallback(async () => {
    try {
      const [exRes, wallRes, pendRes, revRes] = await Promise.all([
        axios.get(`/api/project-dna/${userId}?state=extract`).catch(() => null),
        axios.get(`/api/project-dna/${userId}?state=wall`).catch(() => null),
        axios.get(`/api/project-dna/${userId}/pending`).catch(() => null),
        axios.get(`/api/project-dna/${userId}/revisions`).catch(() => null),
      ]);
      setExtractDna(exRes?.data?.success ? exRes.data.projectDNA : null);
      setWallDna(wallRes?.data?.success ? wallRes.data.projectDNA : null);
      setPending(pendRes?.data?.success ? pendRes.data : { pending: false });
      setRevisions(revRes?.data?.success ? (revRes.data.revisions || []) : []);
    } catch {
      /* noop */
    }
  }, [userId]);

  useEffect(() => {
    fetchSources();
    fetchDna();
  }, [fetchSources, fetchDna]);

  // ───── Dropzone ─────

  const onDrop = useCallback((acceptedFiles) => {
    setPendingFiles((prev) => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md'],
      'text/plain': ['.txt'],
      'application/json': ['.json'],
      'text/x-typescript': ['.ts', '.tsx'],
      'text/javascript': ['.js', '.jsx'],
      'text/x-python': ['.py'],
      'application/toml': ['.toml'],
      'text/yaml': ['.yaml', '.yml'],
    },
    multiple: true,
    disabled: scanning,
  });

  const removePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ───── Actions ─────

  const runUpload = async () => {
    if (pendingFiles.length === 0) return;
    setScanning(true);
    setError(null);
    try {
      const formData = new FormData();
      pendingFiles.forEach((f) => formData.append('files', f));
      if (direction.trim()) formData.append('direction', direction.trim());
      formData.append('userId', userId);

      const res = await axios.post('/api/project-dna/upload-and-scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      if (res.data.success) {
        setPendingFiles([]);
        setDirection('');
        setToast(
          res.data.projectDNA.newlyAdded
            ? `Added ${res.data.projectDNA.newlyAdded} file(s). Corpus is now ${res.data.projectDNA.corpusSize}.`
            : 'No new files (hash already matched).',
        );
        if (onScanComplete) onScanComplete(res.data.projectDNA);
        await Promise.all([fetchSources(), fetchDna()]);
      } else {
        setError(res.data.error || 'Scan failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const runDirectoryScan = async () => {
    if (!dirPath.trim()) return;
    setScanning(true);
    setError(null);
    try {
      const res = await axios.post(
        '/api/project-dna/scan-directory',
        { path: dirPath.trim(), userId },
        { timeout: 120000 },
      );
      if (res.data.success) {
        setToast('Directory scan complete.');
        if (onScanComplete) onScanComplete(res.data.projectDNA);
        await fetchDna();
      } else {
        setError(res.data.error || 'Scan failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const removeArchivedSource = async (sourceId, filename) => {
    if (!window.confirm(`Remove "${filename}" from the corpus? The extract will re-run; the wall stays until you Save to Wall.`)) {
      return;
    }
    try {
      const res = await axios.delete(`/api/project-dna/sources/${userId}/${sourceId}`);
      if (res.data.success) {
        setToast(`Removed ${filename}. ${res.data.rescanned ? 'Corpus re-extracted.' : 'Corpus empty.'}`);
        await Promise.all([fetchSources(), fetchDna()]);
      } else {
        setError(res.data.error || 'Remove failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Remove failed');
    }
  };

  const saveToWall = async () => {
    setPromoting(true);
    setError(null);
    try {
      const res = await axios.post(`/api/project-dna/${userId}/save-to-wall`, {});
      if (res.data.success) {
        if (res.data.wasBootstrap) {
          setToast('Wall initialised.');
        } else {
          const e = res.data.editsReplayed || {};
          const count = (e.scalars || 0) + (e.adds || 0) + (e.removes || 0);
          if (count > 0) {
            setToast(
              `Extract saved to Wall. ${count} user edit${count === 1 ? '' : 's'} carried forward ` +
              `(${e.scalars || 0} scalar, ${e.adds || 0} added, ${e.removes || 0} removed). Old wall archived.`
            );
          } else {
            setToast('Extract saved to Wall. Old wall archived in revisions.');
          }
        }
        await fetchDna();
      } else {
        setError(res.data.error || 'Save failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Save failed');
    } finally {
      setPromoting(false);
    }
  };

  // ───── Derived ─────

  const hasWall = !!wallDna;
  const scanButtonLabel = scanning
    ? 'Scanning...'
    : hasWall
      ? 'Refine Lineage'
      : 'Scan Identity';

  const toastClear = () => setTimeout(() => setToast(null), 4000);
  useEffect(() => { if (toast) toastClear(); }, [toast]);

  return (
    <div className={embedded ? '' : 'card'}>
      {!embedded && (
        <div className="mb-6">
          <h3 className="text-display-md mb-2">Project DNA</h3>
          <p className="text-body text-brand-secondary">
            Upload your manifesto, pitch, or strategy docs. We extract who you are.
            Files archive on disk; the corpus grows with every upload.
          </p>
          <p className="text-body-sm text-brand-secondary mt-2">
            <a
              href={SUBTASTE_TWELVE_ARCHETYPES_URL}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-brand-text"
            >
              See the 12 archetypes →
            </a>
          </p>
        </div>
      )}

      {/* Three tabs */}
      <div className="flex gap-4 mb-6 border-b border-brand-border">
        {[
          { id: 'sources', label: `Sources (${archivedSources.length})` },
          { id: 'extract', label: pending.pending ? 'Extract · draft' : 'Extract' },
          { id: 'wall', label: 'Wall' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 uppercase-label transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-brand-text text-brand-text'
                : 'text-brand-secondary hover:text-brand-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="border border-brand-border p-3 mb-4">
          <p className="text-body-sm text-brand-text">{toast}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-brand-border p-3 mb-4" style={{ borderColor: '#F87171' }}>
          <p className="text-body-sm" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      {/* ═══ SOURCES ═══ */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Mode switch: upload vs directory */}
          <div className="flex gap-3 text-body-sm">
            <button
              onClick={() => setSourcesMode('upload')}
              className={`uppercase-label ${sourcesMode === 'upload' ? 'text-brand-text' : 'text-brand-secondary hover:text-brand-text'}`}
            >
              Upload files
            </button>
            <span className="text-brand-secondary">·</span>
            <button
              onClick={() => setSourcesMode('directory')}
              className={`uppercase-label ${sourcesMode === 'directory' ? 'text-brand-text' : 'text-brand-secondary hover:text-brand-text'}`}
            >
              Scan directory
            </button>
          </div>

          {sourcesMode === 'upload' && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border border-brand-border p-8 text-center cursor-pointer transition-all ${
                  isDragActive ? 'border-brand-text bg-brand-bg' : 'hover:border-brand-text'
                } ${scanning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <p className="text-body text-brand-secondary mb-2">
                  {isDragActive ? 'Drop files here' : 'Drag project files or click to browse'}
                </p>
                <p className="text-body-sm text-brand-secondary">
                  MD · TXT · JSON · TS · TSX · JS · JSX · PY · TOML · YAML
                </p>
              </div>

              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="uppercase-label text-brand-secondary">
                    {pendingFiles.length} pending upload{pendingFiles.length === 1 ? '' : 's'}
                  </p>
                  {pendingFiles.slice(0, 10).map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 border border-brand-border"
                    >
                      <span className="text-body truncate flex-1">{file.name}</span>
                      <button
                        onClick={() => removePendingFile(idx)}
                        className="ml-3 text-brand-secondary hover:text-brand-text text-body-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="uppercase-label text-brand-secondary block mb-2">
                  Direction <span className="normal-case">(optional)</span>
                </label>
                <textarea
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  placeholder="One line: what do you build? Helps extraction stay sharp."
                  rows={3}
                  disabled={scanning}
                  className="input-field w-full resize-none"
                />
              </div>

              <button
                onClick={runUpload}
                disabled={pendingFiles.length === 0 || scanning}
                className="btn-primary w-full"
              >
                {scanButtonLabel}
              </button>
            </div>
          )}

          {sourcesMode === 'directory' && (
            <div className="space-y-4">
              <div>
                <label className="uppercase-label text-brand-secondary block mb-2">
                  Directory path
                </label>
                <input
                  type="text"
                  value={dirPath}
                  onChange={(e) => setDirPath(e.target.value)}
                  placeholder="/home/you/projects"
                  disabled={scanning}
                  className="input-field w-full"
                />
              </div>
              <button
                onClick={runDirectoryScan}
                disabled={!dirPath.trim() || scanning}
                className="btn-primary w-full"
              >
                {scanButtonLabel}
              </button>
            </div>
          )}

          {/* Archived corpus */}
          <div className="pt-4 border-t border-brand-border">
            <p className="uppercase-label text-brand-secondary mb-3">
              Archived corpus ({archivedSources.length} file{archivedSources.length === 1 ? '' : 's'})
            </p>
            {archivedSources.length === 0 ? (
              <p className="text-body-sm text-brand-secondary">
                No files yet. Upload a manifesto, pitch, or strategy document to begin.
              </p>
            ) : (
              <ul className="space-y-2">
                {archivedSources.map((src) => (
                  <li
                    key={src.id}
                    className="flex items-center justify-between py-2 px-3 border border-brand-border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-body truncate">{src.filename}</div>
                      <div className="text-body-sm text-brand-secondary">
                        {(src.byte_size / 1024).toFixed(1)} KB · uploaded{' '}
                        {new Date(src.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => removeArchivedSource(src.id, src.filename)}
                      className="ml-3 text-brand-secondary hover:text-brand-text text-body-sm"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ═══ EXTRACT ═══ */}
      {activeTab === 'extract' && (
        <div className="space-y-4">
          {!extractDna ? (
            <div className="border border-brand-border p-4">
              <p className="text-body-sm text-brand-secondary">
                Nothing extracted yet. Upload a file or scan a directory in Sources.
              </p>
            </div>
          ) : (
            <>
              {pending.pending && (
                <div className="border border-brand-border p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="uppercase-label text-brand-secondary">Pending commit</p>
                    <p className="text-body-sm text-brand-text mt-1">
                      {pending.reason === 'no_wall_yet'
                        ? 'No wall yet. Save this extract to make it canonical.'
                        : 'The extract is newer than the wall. Save to Wall to promote it.'}
                      {pending.wallEdited && pending.reason !== 'no_wall_yet' && (
                        <span className="block text-brand-secondary mt-1">
                          Your wall has edits since the last promotion. They will be replayed on top of the new extract automatically.
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={saveToWall}
                    disabled={promoting}
                    className="btn-primary shrink-0"
                  >
                    {promoting ? 'Saving...' : 'Save to Wall'}
                  </button>
                </div>
              )}
              <DnaView dna={extractDna} />
            </>
          )}
        </div>
      )}

      {/* ═══ WALL ═══ */}
      {activeTab === 'wall' && (
        <div className="space-y-4">
          {!wallDna ? (
            <div className="border border-brand-border p-4">
              <p className="text-body-sm text-brand-secondary">
                No wall yet. Promote an extract to create the canonical identity.
              </p>
            </div>
          ) : (
            <>
              <div className="border border-brand-border p-3">
                <p className="uppercase-label text-brand-secondary">Canonical identity · editable</p>
                <p className="text-body-sm text-brand-text mt-1">
                  {pending.pending
                    ? `Last saved ${pending.wallScannedAt ? new Date(pending.wallScannedAt).toLocaleString() : ''}. A newer extract is pending.`
                    : 'In sync with the current extract.'}
                </p>
                <p className="text-body-sm text-brand-secondary mt-2">
                  Click any field to edit. Every change is logged to the revision history below.
                </p>
              </div>
              <EditableDnaView
                dna={wallDna}
                userId={userId}
                onChange={fetchDna}
                setToast={setToast}
                setError={setError}
              />
              {revisions.length > 0 && (
                <details className="border border-brand-border p-3">
                  <summary className="uppercase-label text-brand-secondary cursor-pointer">
                    Revision history ({revisions.length})
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {revisions.slice(0, 20).map((r) => (
                      <li key={r.id} className="text-body-sm">
                        <span className="uppercase-label text-brand-secondary mr-2">
                          {r.kind}
                        </span>
                        <span className="text-brand-secondary">
                          {new Date(r.revisedAt).toLocaleString()}
                        </span>
                        {r.evidence && (
                          <span className="text-brand-secondary ml-2 italic">
                            {r.evidence}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Read-only DNA field renderer. Empty fields render as greyed "not detected"
 * placeholders so gaps are visible without a conversational agent.
 */
function DnaView({ dna }) {
  if (!dna) return null;
  const ci = dna.coreIdentity || {};
  const tn = dna.tone || {};
  const ev = dna.expansionVectors || {};

  const Field = ({ label, value, empty }) => (
    <div>
      <p className="uppercase-label text-brand-secondary mb-1">{label}</p>
      {value ? (
        <p className="text-body text-brand-text">{value}</p>
      ) : (
        <p className="text-body-sm text-brand-secondary italic">{empty}</p>
      )}
    </div>
  );

  const Chips = ({ label, items, empty, muted }) => (
    <div>
      <p className="uppercase-label text-brand-secondary mb-2">{label}</p>
      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 border border-brand-border text-body-sm ${muted ? 'text-brand-secondary' : ''}`}
            >
              {typeof item === 'string' ? item : item.name || JSON.stringify(item)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-body-sm text-brand-secondary italic">{empty}</p>
      )}
    </div>
  );

  return (
    <div className="border border-brand-border p-4 space-y-4">
      <Field label="Thesis" value={ci.thesis} empty="Not detected in sources" />
      <Chips label="Domains" items={ci.domains} empty="No domains extracted" />
      <Chips label="Tools" items={ci.tools} empty="No tools extracted" />
      <Field label="Tone register" value={tn.register} empty="Not detected in sources" />
      <Chips label="Anti-taste" items={ci.antiTaste} empty="No anti-taste extracted" muted />
      <Chips label="Expansion gaps" items={ev.gaps} empty="No gaps flagged" muted />
    </div>
  );
}

/**
 * Editable Wall view. Every field is click-to-edit; every change
 * rides the rename/revise/remove-item endpoints so revisions are
 * logged automatically. Array fields support inline rename, remove,
 * and add-new.
 */
function EditableDnaView({ dna, userId, onChange, setToast, setError }) {
  if (!dna) return null;
  const ci = dna.coreIdentity || {};
  const tn = dna.tone || {};

  const post = async (endpoint, body) => {
    try {
      const res = await axios.post(`/api/project-dna/${userId}/${endpoint}`, body);
      if (res.data.success) {
        if (setToast) setToast('Saved. Revision logged.');
        if (onChange) await onChange();
      } else {
        if (setError) setError(res.data.error || 'Save failed');
      }
    } catch (err) {
      if (setError) setError(err.response?.data?.error || err.message || 'Save failed');
    }
  };

  const rename = (path, to, evidence) =>
    post('rename', { path, to, evidence: evidence || null });
  const revise = (path, value, evidence) =>
    post('revise', { kind: 'patch', path, value, evidence: evidence || null });
  const appendItem = (path, value, evidence) =>
    post('revise', { kind: 'patch', path: `${path}[+]`, value, evidence: evidence || null });
  const removeItem = (path, evidence) =>
    post('remove-item', { path, evidence: evidence || null });

  return (
    <div className="border border-brand-border p-4 space-y-5">
      <EditableString
        label="Thesis"
        value={ci.thesis}
        onSave={(v) => revise('coreIdentity.thesis', v, 'edited on wall')}
        empty="Click to add thesis"
        multiline
      />

      <EditableList
        label="Domains"
        path="coreIdentity.domains"
        items={ci.domains}
        onRename={(idx, to) => rename(`coreIdentity.domains[${idx}]`, to, 'renamed on wall')}
        onRemove={(idx) => removeItem(`coreIdentity.domains[${idx}]`, 'removed on wall')}
        onAdd={(v) => appendItem('coreIdentity.domains', v, 'added on wall')}
      />

      <EditableList
        label="Tools"
        path="coreIdentity.tools"
        items={ci.tools}
        onRename={(idx, to) => rename(`coreIdentity.tools[${idx}]`, to, 'renamed on wall')}
        onRemove={(idx) => removeItem(`coreIdentity.tools[${idx}]`, 'removed on wall')}
        onAdd={(v) => appendItem('coreIdentity.tools', v, 'added on wall')}
      />

      <EditableString
        label="Tone register"
        value={tn.register}
        onSave={(v) => revise('tone.register', v, 'edited on wall')}
        empty="Click to add tone register"
      />

      <EditableList
        label="Anti-taste"
        path="coreIdentity.antiTaste"
        items={ci.antiTaste}
        muted
        onRename={(idx, to) => rename(`coreIdentity.antiTaste[${idx}]`, to, 'renamed on wall')}
        onRemove={(idx) => removeItem(`coreIdentity.antiTaste[${idx}]`, 'removed on wall')}
        onAdd={(v) => appendItem('coreIdentity.antiTaste', v, 'added on wall')}
      />

      <EditableList
        label="Expansion gaps"
        path="expansionVectors.gaps"
        items={(dna.expansionVectors || {}).gaps}
        muted
        onRename={(idx, to) => rename(`expansionVectors.gaps[${idx}]`, to, 'renamed on wall')}
        onRemove={(idx) => removeItem(`expansionVectors.gaps[${idx}]`, 'removed on wall')}
        onAdd={(v) => appendItem('expansionVectors.gaps', v, 'added on wall')}
      />
    </div>
  );
}

/**
 * Click-to-edit text field. Single-line input by default; multiline
 * switches to a textarea. Escape cancels; Enter (or blur) commits.
 */
function EditableString({ label, value, onSave, empty, multiline }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  useEffect(() => { setDraft(value || ''); }, [value]);

  const commit = async () => {
    const next = draft.trim();
    if (next === (value || '').trim()) { setEditing(false); return; }
    if (!next) { setEditing(false); return; }
    await onSave(next);
    setEditing(false);
  };

  const cancel = () => { setDraft(value || ''); setEditing(false); };

  if (editing) {
    return (
      <div>
        <p className="uppercase-label text-brand-secondary mb-1">{label}</p>
        {multiline ? (
          <textarea
            className="input-field w-full"
            rows={3}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
          />
        ) : (
          <input
            type="text"
            className="input-field w-full"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') cancel();
            }}
          />
        )}
        <p className="text-body-sm text-brand-secondary mt-1">
          Enter to save · Esc to cancel
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="uppercase-label text-brand-secondary mb-1">{label}</p>
      {value ? (
        <p
          className="text-body text-brand-text cursor-text hover:opacity-80"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {value}
        </p>
      ) : (
        <p
          className="text-body-sm text-brand-secondary italic cursor-pointer hover:text-brand-text"
          onClick={() => setEditing(true)}
        >
          {empty}
        </p>
      )}
    </div>
  );
}

/**
 * Inline-editable list of chips. Click a chip to rename, × to remove,
 * + chip at the end to add. Works for any string-array field.
 */
function EditableList({ label, items, onRename, onRemove, onAdd, muted }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState('');

  const startEdit = (idx, current) => {
    setEditingIdx(idx);
    setEditDraft(typeof current === 'string' ? current : (current?.name || JSON.stringify(current)));
  };
  const commitEdit = async (idx) => {
    const v = editDraft.trim();
    if (!v) { setEditingIdx(null); return; }
    await onRename(idx, v);
    setEditingIdx(null);
  };
  const cancelEdit = () => setEditingIdx(null);

  const commitAdd = async () => {
    const v = addDraft.trim();
    if (!v) { setAdding(false); return; }
    await onAdd(v);
    setAddDraft('');
    setAdding(false);
  };

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div>
      <p className="uppercase-label text-brand-secondary mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {safeItems.map((item, idx) => {
          const text = typeof item === 'string' ? item : (item?.name || JSON.stringify(item));
          if (editingIdx === idx) {
            return (
              <input
                key={idx}
                type="text"
                autoFocus
                className="input-field"
                style={{ width: Math.max(120, text.length * 9) + 'px', padding: '4px 8px' }}
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onBlur={() => commitEdit(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit(idx);
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
            );
          }
          return (
            <span
              key={idx}
              className={`inline-flex items-center px-2 py-1 border border-brand-border text-body-sm ${muted ? 'text-brand-secondary' : ''}`}
            >
              <span
                className="cursor-pointer hover:text-brand-text"
                onClick={() => startEdit(idx, item)}
                title="Click to rename"
              >
                {text}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove "${text}"?`)) onRemove(idx);
                }}
                className="ml-2 text-brand-secondary hover:text-brand-text"
                title="Remove"
              >
                ×
              </button>
            </span>
          );
        })}
        {adding ? (
          <input
            type="text"
            autoFocus
            className="input-field"
            style={{ width: '180px', padding: '4px 8px' }}
            placeholder="new item"
            value={addDraft}
            onChange={(e) => setAddDraft(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') { setAdding(false); setAddDraft(''); }
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-2 py-1 border border-brand-border text-body-sm text-brand-secondary hover:text-brand-text hover:border-brand-text"
            title="Add item"
          >
            + add
          </button>
        )}
      </div>
    </div>
  );
}

export default ProjectDNAPanel;
