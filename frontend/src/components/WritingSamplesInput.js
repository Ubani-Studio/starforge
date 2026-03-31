import React, { useState, useEffect } from 'react';

/**
 * Dual-Layer Writing Samples Input
 * Social Posts (70%) + Subconscious Writing (30%)
 */
const WritingSamplesInput = ({ embedded = false, userId = 'default_user' }) => {
  const [socialPosts, setSocialPosts] = useState('');
  const [subconsciousWriting, setSubconsciousWriting] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSamples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadSamples = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/writing-samples?userId=${userId}`);
      const data = await response.json();

      if (data.success && data.hasSamples) {
        setSocialPosts(data.socialPosts || '');
        setSubconsciousWriting(data.subconsciousWriting || '');
      }
    } catch (err) {
      console.error('Error loading writing samples:', err);
    }
  };

  const handleSave = async () => {
    const totalChars = socialPosts.length + subconsciousWriting.length;

    if (totalChars < 50) {
      setError('Need at least 50 characters total');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/writing-samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          socialPosts: socialPosts || null,
          subconsciousWriting: subconsciousWriting || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error || 'Save failed');
      }
    } catch (err) {
      setError('Save failed');
    } finally {
      setLoading(false);
    }
  };

  const totalChars = socialPosts.length + subconsciousWriting.length;

  return (
    <div className={embedded ? '' : 'border border-brand-border p-4 mb-6'}>
      {!embedded && (
        <div className="mb-3">
          <p className="uppercase-label text-brand-secondary mb-1">Train Your Voice</p>
          <p className="text-body-sm text-brand-muted">
            Social posts (structure) + raw writing (authenticity) = your voice
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Social Posts */}
        <div>
          <label className="block text-body-xs text-brand-secondary mb-2 uppercase tracking-wide">
            Social Posts (70% weight)
          </label>
          <textarea
            value={socialPosts}
            onChange={(e) => setSocialPosts(e.target.value)}
            placeholder="Paste 3-5 social media captions/bios..."
            className="w-full h-48 p-3 bg-brand-bg border border-brand-border text-brand-text text-body-sm font-mono resize-y focus:outline-none focus:border-brand-primary"
          />
          <p className="text-body-xs text-brand-muted mt-1">{socialPosts.length} chars</p>
        </div>

        {/* Subconscious Writing */}
        <div>
          <label className="block text-body-xs text-brand-secondary mb-2 uppercase tracking-wide">
            Raw Writing (30% weight)
          </label>
          <textarea
            value={subconsciousWriting}
            onChange={(e) => setSubconsciousWriting(e.target.value)}
            placeholder="Stream of consciousness, no filter, just how you think..."
            className="w-full h-48 p-3 bg-brand-bg border border-brand-border text-brand-text text-body-sm font-mono resize-y focus:outline-none focus:border-brand-primary"
          />
          <p className="text-body-xs text-brand-muted mt-1">{subconsciousWriting.length} chars</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-body-xs text-brand-muted">
          Total: {totalChars} chars
          {totalChars < 50 && <span className="text-yellow-500 ml-2">(min 50)</span>}
        </p>

        <button
          onClick={handleSave}
          disabled={totalChars < 50 || loading}
          className="btn-primary text-body-xs px-4 py-1 disabled:opacity-50"
        >
          {loading ? 'Saving...' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {error && <p className="text-body-xs text-red-500 mt-2">{error}</p>}
      {saved && <p className="text-body-xs text-green-500 mt-2">Voice training updated</p>}
    </div>
  );
};

export default WritingSamplesInput;
