import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

/**
 * Project DNA Scanner
 * Extracts identity signal from codebases — thesis, domain, tools, tone
 * Aesthetic: Minimal, chic, editorial (matches AudioAnalysisCompact)
 */
const ProjectDNAPanel = ({ embedded = false, onScanComplete }) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'directory'
  const [files, setFiles] = useState([]);
  const [direction, setDirection] = useState('');
  const [dirPath, setDirPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  // File upload via dropzone
  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
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
      'text/yaml': ['.yaml', '.yml']
    },
    multiple: true,
    disabled: scanning
  });

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload files and scan
  const handleUploadScan = async () => {
    if (files.length === 0) return;

    setScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      if (direction.trim()) {
        formData.append('direction', direction.trim());
      }

      const response = await axios.post('/api/project-dna/upload-and-scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });

      if (response.data.success) {
        setScanResult(response.data.projectDNA);
        setFiles([]);
        setDirection('');
        if (onScanComplete) {
          onScanComplete(response.data.projectDNA);
        }
      } else {
        setError(response.data.error || 'Scan failed');
      }
    } catch (err) {
      console.error('Project DNA scan failed:', err);
      setError(err.response?.data?.error || err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  // Directory scan
  const handleDirectoryScan = async () => {
    if (!dirPath.trim()) return;

    setScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const response = await axios.post('/api/project-dna/scan-directory', {
        path: dirPath.trim(),
        userId: 'default'
      }, {
        timeout: 120000
      });

      if (response.data.success) {
        setScanResult(response.data.projectDNA);
        if (onScanComplete) {
          onScanComplete(response.data.projectDNA);
        }
      } else {
        setError(response.data.error || 'Scan failed');
      }
    } catch (err) {
      console.error('Directory scan failed:', err);
      setError(err.response?.data?.error || err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className={embedded ? '' : 'card'}>
      {/* Header */}
      {!embedded && (
        <div className="mb-6">
          <h3 className="text-display-md mb-2">Project DNA</h3>
          <p className="text-body text-brand-secondary">
            Extract identity signal from your codebase
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-brand-border">
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-3 px-1 uppercase-label transition-colors ${
            activeTab === 'upload'
              ? 'border-b-2 border-brand-text text-brand-text'
              : 'text-brand-secondary hover:text-brand-text'
          }`}
        >
          Upload Files
        </button>
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 px-1 uppercase-label transition-colors ${
            activeTab === 'directory'
              ? 'border-b-2 border-brand-text text-brand-text'
              : 'text-brand-secondary hover:text-brand-text'
          }`}
        >
          Scan Directory
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border border-brand-border p-8 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-brand-text bg-brand-bg' : 'hover:border-brand-text'
            } ${scanning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <p className="text-body text-brand-secondary mb-2">
              {isDragActive
                ? 'Drop files here'
                : 'Drag project files or click to browse'}
            </p>
            <p className="text-body-sm text-brand-secondary">
              MD, TXT, JSON, TS, TSX, JS, JSX, PY, TOML, YAML
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="uppercase-label text-brand-secondary mb-3">
                {files.length} file{files.length !== 1 ? 's' : ''} ready
              </p>
              {files.slice(0, 5).map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 border border-brand-border"
                >
                  <span className="text-body truncate flex-1">{file.name}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="ml-3 text-brand-secondary hover:text-brand-text text-body-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {files.length > 5 && (
                <p className="text-body-sm text-brand-secondary pl-3">
                  +{files.length - 5} more
                </p>
              )}
            </div>
          )}

          {/* Direction Textarea */}
          <div>
            <label className="uppercase-label text-brand-secondary block mb-2">
              Direction
            </label>
            <textarea
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder="Brief: what do you build? (optional — helps extraction)"
              rows={3}
              disabled={scanning}
              className="input-field w-full resize-none"
            />
          </div>

          {/* Scan Button */}
          <button
            onClick={handleUploadScan}
            disabled={files.length === 0 || scanning}
            className="btn-primary w-full"
          >
            {scanning ? 'Scanning...' : 'Scan Identity'}
          </button>
        </div>
      )}

      {/* Directory Tab */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div>
            <label className="uppercase-label text-brand-secondary block mb-2">
              Directory Path
            </label>
            <input
              type="text"
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              placeholder="/home/user/my-projects"
              disabled={scanning}
              className="input-field w-full"
            />
          </div>

          <button
            onClick={handleDirectoryScan}
            disabled={!dirPath.trim() || scanning}
            className="btn-primary w-full"
          >
            {scanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-brand-border p-4 mt-4">
          <p className="text-body text-brand-secondary">
            {error}
          </p>
        </div>
      )}

      {/* Scan Result */}
      {scanResult && (() => {
        const ci = scanResult.coreIdentity || {};
        const ev = scanResult.expansionVectors || {};
        const tn = scanResult.tone || {};
        return (
          <div className="border border-brand-border p-4 mt-4 space-y-4">
            <p className="uppercase-label text-brand-secondary">Identity Extracted</p>

            {/* Thesis */}
            {ci.thesis && (
              <div>
                <p className="uppercase-label text-brand-secondary mb-1">Thesis</p>
                <p className="text-body text-brand-text">{ci.thesis}</p>
              </div>
            )}

            {/* Domains */}
            {ci.domains && ci.domains.length > 0 && (
              <div>
                <p className="uppercase-label text-brand-secondary mb-2">Domains</p>
                <div className="flex flex-wrap gap-2">
                  {ci.domains.map((domain, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 border border-brand-border text-body-sm"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tools */}
            {ci.tools && ci.tools.length > 0 && (
              <div>
                <p className="uppercase-label text-brand-secondary mb-2">Tools</p>
                <div className="flex flex-wrap gap-2">
                  {ci.tools.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 border border-brand-border text-body-sm"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tone */}
            {tn.register && (
              <div>
                <p className="uppercase-label text-brand-secondary mb-1">Tone Register</p>
                <p className="text-body-sm text-brand-text">{tn.register}</p>
              </div>
            )}

            {/* Anti-Taste */}
            {ci.antiTaste && ci.antiTaste.length > 0 && (
              <div>
                <p className="uppercase-label text-brand-secondary mb-2">Anti-Taste</p>
                <div className="flex flex-wrap gap-2">
                  {ci.antiTaste.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 border border-brand-border text-body-sm text-brand-secondary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Expansion Gaps */}
            {ev.gaps && ev.gaps.length > 0 && (
              <div>
                <p className="uppercase-label text-brand-secondary mb-2">Expansion Gaps</p>
                <ul className="space-y-1">
                  {ev.gaps.map((gap, idx) => (
                    <li key={idx} className="text-body-sm text-brand-secondary">
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources Count */}
            {scanResult.sourcesScanned != null && (
              <div className="pt-3 border-t border-brand-border">
                <span className="text-body-sm text-brand-secondary">Sources scanned:</span>
                <span className="ml-2 text-body-sm text-brand-text font-medium">
                  {Array.isArray(scanResult.sourcesScanned) ? scanResult.sourcesScanned.length : scanResult.sourcesScanned}
                </span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default ProjectDNAPanel;
