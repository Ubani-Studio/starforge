import React, { useState } from 'react';
import axios from 'axios';

/**
 * AI Generation Panel
 * Generate content using personal AI twin trained on aesthetic DNA
 * DIFFERENTIATOR: AI trained on YOUR taste, not generic ChatGPT
 */
const AIGenerationPanel = ({ embedded = false, userId = 'default_user' }) => {
  const [activeTab, setActiveTab] = useState('bio');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);

  // Bio options
  const [bioTone, setBioTone] = useState('sophisticated');
  const [bioLength, setBioLength] = useState('medium');

  // Caption options
  const [captionContext, setCaptionContext] = useState('');
  const [captionStyle, setCaptionStyle] = useState('minimal');

  // Press release options
  const [pressContext, setPressContext] = useState('');

  const tabs = [
    { id: 'bio', label: 'Artist Bio' },
    { id: 'caption', label: 'Social Caption' },
    { id: 'press', label: 'Press Release' }
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setOutput(null);

    try {
      let response;

      if (activeTab === 'bio') {
        response = await axios.post('/api/ai/generate-bio', {
          userId,
          tone: bioTone,
          length: bioLength
        });
        setOutput(response.data.bio);
      } else if (activeTab === 'caption') {
        if (!captionContext.trim()) {
          setError('Please provide context for the caption (e.g., "New mix dropping Friday")');
          setLoading(false);
          return;
        }
        response = await axios.post('/api/ai/generate-caption', {
          userId,
          context: captionContext,
          style: captionStyle
        });
        setOutput(response.data.caption);
      } else if (activeTab === 'press') {
        if (!pressContext.trim()) {
          setError('Please provide event/release context');
          setLoading(false);
          return;
        }
        response = await axios.post('/api/ai/generate-press-release', {
          userId,
          eventContext: pressContext
        });
        setOutput(response.data.pressRelease);
      }
    } catch (err) {
      console.error('AI generation error:', err);
      if (err.response?.status === 403) {
        setError(`This feature requires ${err.response.data.requiredTier} tier. Upgrade to unlock AI generation.`);
      } else {
        setError(err.response?.data?.error || 'Generation failed. Make sure you have uploaded music and/or connected Tizita.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className={embedded ? '' : 'card'}>
      {!embedded && (
        <>
          <h3 className="text-display-md mb-2">AI Generation</h3>
          <p className="text-body-sm text-brand-secondary mb-6">
            Personal AI trained on your aesthetic DNA
          </p>
        </>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-brand-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setOutput(null);
              setError(null);
            }}
            className={`pb-3 px-2 text-sm uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'text-brand-text border-b-2 border-brand-primary'
                : 'text-brand-secondary hover:text-brand-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bio Options */}
      {activeTab === 'bio' && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block uppercase-label text-brand-secondary mb-2">
              Tone
            </label>
            <select
              value={bioTone}
              onChange={(e) => setBioTone(e.target.value)}
              className="input-field"
            >
              <option value="sophisticated">Sophisticated (tastemaker voice)</option>
              <option value="casual">Casual (conversational)</option>
              <option value="minimal">Minimal (sparse, poetic)</option>
              <option value="poetic">Poetic (evocative, artistic)</option>
            </select>
          </div>

          <div>
            <label className="block uppercase-label text-brand-secondary mb-2">
              Length
            </label>
            <select
              value={bioLength}
              onChange={(e) => setBioLength(e.target.value)}
              className="input-field"
            >
              <option value="short">Short (~100 words)</option>
              <option value="medium">Medium (~200 words)</option>
              <option value="long">Long (~300 words)</option>
            </select>
          </div>
        </div>
      )}

      {/* Caption Options */}
      {activeTab === 'caption' && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block uppercase-label text-brand-secondary mb-2">
              Context (What are you posting about?)
            </label>
            <textarea
              value={captionContext}
              onChange={(e) => setCaptionContext(e.target.value)}
              placeholder="e.g., New mix dropping Friday, Playing at warehouse tonight, Back in the studio..."
              className="input-field h-24 resize-none"
            />
          </div>

          <div>
            <label className="block uppercase-label text-brand-secondary mb-2">
              Style
            </label>
            <select
              value={captionStyle}
              onChange={(e) => setCaptionStyle(e.target.value)}
              className="input-field"
            >
              <option value="minimal">Minimal (under 50 words, no hashtags)</option>
              <option value="poetic">Poetic (evocative, artistic)</option>
              <option value="technical">Technical (production details)</option>
              <option value="hype">Hype (energetic, excitement)</option>
            </select>
          </div>
        </div>
      )}

      {/* Press Release Options */}
      {activeTab === 'press' && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block uppercase-label text-brand-secondary mb-2">
              Event/Release Context
            </label>
            <textarea
              value={pressContext}
              onChange={(e) => setPressContext(e.target.value)}
              placeholder="e.g., New EP releasing next month, Headlining festival in August, Residency at XYZ venue..."
              className="input-field h-24 resize-none"
            />
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn-primary w-full mb-6"
      >
        {loading ? 'Generating...' : 'Generate'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="p-4 border border-red-500/30 bg-red-500/10 mb-6">
          <p className="text-body-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Output Display */}
      {output && (
        <div className="border border-brand-border p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="uppercase-label text-brand-secondary">Generated Output</p>
            <button
              onClick={handleCopy}
              className="text-body-xs text-brand-accent hover:text-brand-primary"
            >
              Copy
            </button>
          </div>

          <div className="text-body text-brand-text whitespace-pre-wrap">
            {output}
          </div>

          <div className="mt-4 pt-4 border-t border-brand-border">
            <p className="text-body-xs text-brand-secondary italic">
              Generated using your aesthetic DNA: {activeTab === 'bio' ? `${bioTone} tone, ${bioLength} length` : activeTab === 'caption' ? `${captionStyle} style` : 'press release format'}
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!output && !loading && !error && (
        <div className="border border-brand-border p-4 bg-brand-surface/50">
          <p className="text-body-sm text-brand-secondary">
            <strong>How this works:</strong> Your AI twin analyzes your music library
            ({activeTab === 'bio' ? 'BPM, energy, genres, influences' : activeTab === 'caption' ? 'taste profile, coherence' : 'aesthetic identity'})
            {' '}and generates content that sounds like YOU, not generic AI.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIGenerationPanel;
