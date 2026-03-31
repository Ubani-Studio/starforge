import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HubCard from './HubCard';
import CollapsibleSection from './CollapsibleSection';
import AudioDNAPanel from './AudioDNAPanel';
import CrossModalCoherence from './CrossModalCoherence';
import ContextComparisonView from './ContextComparisonView';
import TasteCoherenceView from './TasteCoherenceView';
import InfluenceGenealogyPanel from './InfluenceGenealogyPanel';
import ProjectDNAPanel from './ProjectDNAPanel';
import LineageDiscoveries from './LineageDiscoveries';
import VisualLineageDiscovery from './VisualLineageDiscovery';

const NommoPanel = ({ onTwinGenerated, onGlowChange }) => {
  const [caption, setCaption] = useState('');
  const [bio, setBio] = useState('');
  const [glowLevel, setGlowLevel] = useState(3);
  const [tizitaData, setTizitaData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectingTizita, setConnectingTizita] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState('personal');
  const [usageInfo, setUsageInfo] = useState(null);
  const [totalTracks, setTotalTracks] = useState(null);
  const [projectDnaData, setProjectDnaData] = useState(null);
  const [subtasteData, setSubtasteData] = useState(null);
  const [subtasteConnecting, setSubtasteConnecting] = useState(false);
  const [subtasteSource, setSubtasteSource] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchTotalTracks();
    fetchAutoClassification();
    fetchCachedProjectDNA();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await axios.get('/api/subscription/status');
      if (response.data.success) {
        setSubscriptionTier(response.data.tier);
        setUsageInfo(response.data.usage);
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    }
  };

  const fetchTotalTracks = async () => {
    try {
      const response = await axios.get('/api/library/stats', {
        params: { user_id: 'default_user' }
      });
      if (response.data.success) {
        setTotalTracks(response.data.stats.totalTracks);
      }
    } catch (error) {
      console.error('Failed to fetch track count:', error);
    }
  };

  const fetchAutoClassification = async () => {
    try {
      const response = await axios.get('/api/subtaste/auto/default_user');
      if (response.data.success && response.data.classification) {
        setSubtasteData(response.data.classification);
        setSubtasteSource('auto');
      }
    } catch (error) {
      // Auto-classification not available yet
    }
  };

  const fetchCachedProjectDNA = async () => {
    try {
      const response = await axios.get('/api/project-dna/default');
      if (response.data.success) {
        setProjectDnaData(response.data.projectDNA);
      }
    } catch {
      // No cached Project DNA
    }
  };

  const handleConnectSubtaste = async () => {
    setSubtasteConnecting(true);
    try {
      const response = await axios.get('/api/subtaste/genome/default_user');
      if (response.data.success) {
        setSubtasteData(response.data.genome?.archetype || response.data.genome);
        setSubtasteSource('quiz');
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 503) {
        const quizUrl = process.env.REACT_APP_SUBTASTE_URL || 'http://localhost:3001';
        window.location.href = `${quizUrl}/quiz`;
      }
    } finally {
      setSubtasteConnecting(false);
    }
  };

  const handleProjectDnaScanComplete = (projectDNA) => {
    setProjectDnaData(projectDNA);
    fetchAutoClassification();
  };

  const handleGlowChange = (e) => {
    const level = parseInt(e.target.value);
    setGlowLevel(level);
    onGlowChange?.(level);
  };

  const handleConnectTizita = async () => {
    setConnectingTizita(true);
    try {
      const [profileRes, photosRes, dnaRes] = await Promise.all([
        axios.get('/api/deep/tizita/profile'),
        axios.get('/api/deep/tizita/top-photos', {
          params: { limit: 500, minScore: 0 }
        }),
        axios.get('/api/deep/tizita/visual-dna'),
      ]);

      try {
        await axios.post('/api/twin/visual-dna/connect-tizita', {
          user_id: 'default_user',
        });
      } catch (cacheErr) {
        console.warn('Visual DNA cache store failed (non-fatal):', cacheErr.message);
      }

      setTizitaData({
        profile: profileRes.data.profile,
        photos: photosRes.data.photos,
        visualDNA: dnaRes.data.visualDNA
      });

      fetchAutoClassification();
    } catch (error) {
      console.error('Failed to connect to Tizita:', error);
      setTizitaData({
        error: true,
        visualDNA: {
          styleDescription: 'Connection failed',
          confidence: 0
        }
      });
    } finally {
      setConnectingTizita(false);
    }
  };

  const handleGenerateTwin = async () => {
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('caption', caption);
      formData.append('bio', bio);
      formData.append('glowLevel', glowLevel);

      const response = await axios.post('/api/twin/generate-enhanced', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        onTwinGenerated({
          ...response.data.twinData,
          tizitaData,
        });
      }
    } catch (error) {
      console.error('Failed to generate Twin:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = (totalTracks > 0 || tizitaData || projectDnaData) && (caption || bio);

  const toggleCard = (card) => {
    setExpandedCard(prev => prev === card ? null : card);
  };

  // --- Accent elements for collapsed hub cards ---

  const archetypeGlyph = subtasteData?.primary?.glyph || subtasteData?.glyph;

  const colorSwatches = tizitaData?.visualDNA?.colorPalette?.length > 0 ? (
    <div className="flex gap-1">
      {tizitaData.visualDNA.colorPalette.slice(0, 5).map((color, i) => (
        <div
          key={i}
          className="w-6 h-6 border border-brand-border"
          style={{ backgroundColor: color.hex }}
          title={color.hex}
        />
      ))}
    </div>
  ) : null;

  const hasVisualDNA = !!tizitaData && !tizitaData.error;
  const hasAudioDNA = totalTracks > 0;
  const hasLineage = !!projectDnaData;
  const nothingConnected = !subtasteData && !hasVisualDNA && !hasAudioDNA && !hasLineage;

  return (
    <div>
      {/* Zone 1: Page Title */}
      <h1 className="text-display-xl text-brand-text mb-4">Nommo</h1>
      {nothingConnected && (
        <p className="text-body text-brand-secondary mb-16">
          Connect your creative catalogs to summon your Twin.
        </p>
      )}
      {!nothingConnected && <div className="mb-16" />}

      {/* Zone 2: Hub Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">

        {/* Card 1 — Taste Archetype */}
        <HubCard
          label="Taste Archetype"
          stat={subtasteData?.primary?.designation || subtasteData?.designation || null}
          statLabel={
            subtasteData
              ? subtasteData.primary?.creativeMode || subtasteData.creativeMode || (
                  (subtasteData.primary?.confidence || subtasteData.confidence) > 0
                    ? `${Math.round((subtasteData.primary?.confidence || subtasteData.confidence) * 100)}% confidence`
                    : null
                )
              : null
          }
          connected={!!subtasteData}
          onConnect={handleConnectSubtaste}
          connectLabel={subtasteConnecting ? 'Connecting...' : 'Connect Subtaste'}
          expanded={expandedCard === 'archetype'}
          onToggle={() => toggleCard('archetype')}
          accentElement={archetypeGlyph ? (
            <span className="text-display-lg">{archetypeGlyph}</span>
          ) : null}
        >
          {subtasteData && (
            <div className="space-y-4">
              {/* Primary archetype */}
              <div className="border border-brand-border p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-display-sm">{subtasteData.primary?.glyph || subtasteData.glyph || ''}</span>
                  <div>
                    <p className="text-body text-brand-text font-medium">
                      {subtasteData.primary?.designation || subtasteData.designation || ''}
                    </p>
                    <p className="text-body-sm text-brand-secondary">
                      {subtasteData.primary?.creativeMode || subtasteData.creativeMode || ''}
                    </p>
                  </div>
                  {(subtasteData.primary?.confidence || subtasteData.confidence) > 0 && (
                    <span className="ml-auto text-body-sm text-brand-secondary font-mono">
                      {Math.round((subtasteData.primary?.confidence || subtasteData.confidence) * 100)}%
                    </span>
                  )}
                </div>
                {subtasteData.primary?.essence && (
                  <p className="text-body-sm text-brand-secondary italic">
                    {subtasteData.primary.essence}
                  </p>
                )}
                {subtasteData.primary?.shadow && (
                  <div className="mt-3 pt-3 border-t border-brand-border">
                    <p className="uppercase-label text-brand-secondary mb-1">Shadow</p>
                    <p className="text-body-sm text-brand-secondary">{subtasteData.primary.shadow}</p>
                  </div>
                )}
              </div>

              {/* Secondary + Tertiary */}
              {(subtasteData.secondary || subtasteData.tertiary) && (
                <div className="space-y-2">
                  {subtasteData.secondary && (
                    <div className="flex items-center gap-2 text-body-sm border border-brand-border p-3">
                      <span className="text-brand-text">{subtasteData.secondary.glyph}</span>
                      <span className="text-brand-text">{subtasteData.secondary.designation}</span>
                      <span className="text-brand-secondary">{subtasteData.secondary.creativeMode}</span>
                      {subtasteData.secondary.confidence > 0 && (
                        <span className="ml-auto font-mono text-brand-secondary">
                          {Math.round(subtasteData.secondary.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                  {subtasteData.tertiary && (
                    <div className="flex items-center gap-2 text-body-sm border border-brand-border p-3 opacity-70">
                      <span className="text-brand-text">{subtasteData.tertiary.glyph}</span>
                      <span className="text-brand-text">{subtasteData.tertiary.designation}</span>
                      <span className="text-brand-secondary">{subtasteData.tertiary.creativeMode}</span>
                      {subtasteData.tertiary.confidence > 0 && (
                        <span className="ml-auto font-mono text-brand-secondary">
                          {Math.round(subtasteData.tertiary.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Archetype Distribution */}
              {subtasteData.distribution && (
                <div className="border border-brand-border p-4">
                  <p className="uppercase-label text-brand-secondary mb-3">Archetype Distribution</p>
                  <div className="space-y-1">
                    {Object.entries(subtasteData.distribution)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 6)
                      .map(([designation, weight]) => (
                        <div key={designation} className="flex items-center gap-2">
                          <span className="text-body-sm text-brand-secondary font-mono w-10">{designation}</span>
                          <div className="flex-1 h-2 bg-brand-border">
                            <div
                              className="h-2 bg-brand-text"
                              style={{ width: `${Math.round(weight * 100)}%` }}
                            />
                          </div>
                          <span className="text-body-sm text-brand-secondary font-mono w-10 text-right">
                            {Math.round(weight * 100)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Source + Refine */}
              <div className="flex items-center justify-between pt-2 border-t border-brand-border">
                <span className="uppercase-label text-brand-secondary">
                  {subtasteSource === 'quiz' ? 'Quiz-validated' : 'Auto-classified'}
                </span>
                {subtasteSource !== 'quiz' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const quizUrl = process.env.REACT_APP_SUBTASTE_URL || 'http://localhost:3001';
                      window.location.href = `${quizUrl}/quiz`;
                    }}
                    className="text-body-sm text-brand-text underline"
                  >
                    Refine with quiz
                  </button>
                )}
              </div>
            </div>
          )}
        </HubCard>

        {/* Card 2 — Visual DNA */}
        <HubCard
          label="Visual DNA"
          stat={
            hasVisualDNA
              ? tizitaData.visualDNA?.deepAnalysis?.visualEra?.primary || tizitaData.visualDNA?.styleDescription?.split('.')[0]
              : null
          }
          statLabel={
            hasVisualDNA
              ? `${tizitaData.profile?.stats?.total_photos || 0} photos`
              : null
          }
          connected={hasVisualDNA}
          onConnect={handleConnectTizita}
          connectLabel={connectingTizita ? 'Connecting...' : 'Connect Tizita'}
          expanded={expandedCard === 'visual'}
          onToggle={() => toggleCard('visual')}
          accentElement={colorSwatches}
        >
          {hasVisualDNA && (
            <div className="space-y-4">
              <p className="text-body text-brand-text">
                {tizitaData.visualDNA?.styleDescription}
              </p>

              {/* Art Movements */}
              {tizitaData.visualDNA?.deepAnalysis?.artMovements?.length > 0 && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-2">Art Movements</p>
                  <div className="flex flex-wrap gap-2">
                    {tizitaData.visualDNA.deepAnalysis.artMovements.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 border border-brand-border text-body-sm"
                        title={`Affinity: ${Math.round(m.affinity * 100)}%`}
                      >
                        {m.name} <span className="text-brand-secondary font-mono">{Math.round(m.affinity * 100)}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Influences */}
              {tizitaData.visualDNA?.deepAnalysis?.influences?.length > 0 && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-2">Influences</p>
                  <div className="flex flex-wrap gap-2">
                    {tizitaData.visualDNA.deepAnalysis.influences.map((inf, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 border border-brand-border text-body-sm text-brand-secondary"
                      >
                        {inf}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Composition + Visual Era */}
              {tizitaData.visualDNA?.deepAnalysis?.composition && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="uppercase-label text-brand-secondary mb-1">Composition</p>
                    <p className="text-body-sm text-brand-text">
                      {tizitaData.visualDNA.deepAnalysis.composition.symmetry} •{' '}
                      {tizitaData.visualDNA.deepAnalysis.composition.negative_space} space •{' '}
                      {tizitaData.visualDNA.deepAnalysis.composition.complexity} complexity
                    </p>
                  </div>
                  {tizitaData.visualDNA?.deepAnalysis?.visualEra?.primary && (
                    <div>
                      <p className="uppercase-label text-brand-secondary mb-1">Visual Era</p>
                      <p className="text-body-sm text-brand-text">
                        {tizitaData.visualDNA.deepAnalysis.visualEra.primary}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Color Palette */}
              {tizitaData.visualDNA?.colorPalette?.length > 0 && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-2">Color Palette</p>
                  <div className="flex gap-2">
                    {tizitaData.visualDNA.colorPalette.map((color, idx) => (
                      <div key={idx} className="flex-1">
                        <div
                          className="h-12 border border-brand-border"
                          style={{ backgroundColor: color.hex }}
                          title={`${color.name} (${color.hex})`}
                        />
                        <p className="text-body-sm text-brand-secondary mt-1 text-center">
                          {color.hex}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Profile */}
              {tizitaData.visualDNA?.deepAnalysis?.colorProfile && (
                <div className="flex gap-4 text-body-sm">
                  <span className="text-brand-secondary">
                    Saturation: <span className="text-brand-text">{tizitaData.visualDNA.deepAnalysis.colorProfile.saturation_preference}</span>
                  </span>
                  <span className="text-brand-secondary">
                    Harmony: <span className="text-brand-text">{tizitaData.visualDNA.deepAnalysis.colorProfile.harmony}</span>
                  </span>
                  <span className="text-brand-secondary">
                    Temperature: <span className="text-brand-text">{tizitaData.visualDNA.deepAnalysis.colorProfile.temperature}</span>
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="text-body-sm text-brand-secondary pt-2 border-t border-brand-border">
                {tizitaData.profile?.stats?.total_photos || 0} photos analyzed •{' '}
                {tizitaData.profile?.stats?.highlight_count || 0} highlights
              </div>

              {/* Visual Lineage Discovery */}
              {tizitaData.visualDNA?.colorPalette?.length > 0 && (
                <VisualLineageDiscovery
                  colorPalette={tizitaData.visualDNA.colorPalette}
                />
              )}
            </div>
          )}
        </HubCard>

        {/* Card 3 — Audio DNA */}
        <HubCard
          label="Audio DNA"
          stat={hasAudioDNA ? 'Analyzed' : null}
          statLabel={
            hasAudioDNA
              ? `${totalTracks} track${totalTracks !== 1 ? 's' : ''}`
              : null
          }
          connected={hasAudioDNA}
          connectLabel="Upload tracks in Music Library"
          expanded={expandedCard === 'audio'}
          onToggle={() => toggleCard('audio')}
        >
          <div className="space-y-6">
            <AudioDNAPanel
              embedded
              audioData={{}}
              rekordboxData={{}}
              tizitaData={tizitaData}
            />
            <CrossModalCoherence embedded userId="default_user" />
            <ContextComparisonView embedded userId="default_user" />
            <TasteCoherenceView embedded userId="default_user" />
            <InfluenceGenealogyPanel embedded userId="default_user" />
          </div>
        </HubCard>

        {/* Card 4 — Lineage */}
        <HubCard
          label="Lineage"
          stat={
            hasLineage
              ? projectDnaData?.thesis?.substring(0, 50) || projectDnaData?.identity?.substring(0, 50) || 'Scanned'
              : null
          }
          statLabel={hasLineage ? 'Project DNA' : null}
          connected={hasLineage}
          connectLabel="Scan project files"
          expanded={expandedCard === 'lineage'}
          onToggle={() => toggleCard('lineage')}
        >
          <div className="space-y-6">
            <ProjectDNAPanel embedded onScanComplete={handleProjectDnaScanComplete} />
            <LineageDiscoveries userId="default" projectDnaData={projectDnaData} />
          </div>
        </HubCard>
      </div>

      {/* Zone 3: Generate */}
      <div className="border-t border-brand-border pt-12">
        <CollapsibleSection title="Voice & Identity" summaryValue={caption ? 'Provided' : null}>
          <div className="space-y-4">
            <div>
              <label className="block uppercase-label text-brand-secondary mb-2">
                Caption Sample
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="How do you caption your work? Drop an example..."
                className="input-field h-24 resize-none"
              />
            </div>
            <div>
              <label className="block uppercase-label text-brand-secondary mb-2">
                Bio / Artist Statement
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Who are you? What do you make?"
                className="input-field h-32 resize-none"
              />
            </div>
            <div>
              <p className="uppercase-label text-brand-secondary mb-3">Energy Level</p>
              <div className="flex items-center gap-4">
                <span className="text-body-sm text-brand-secondary">Low</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={glowLevel}
                  onChange={handleGlowChange}
                  className="flex-1 h-1 bg-brand-border appearance-none cursor-pointer accent-brand-text"
                />
                <span className="text-body-sm text-brand-secondary">High</span>
                <span className="text-body-sm font-mono text-brand-text">{glowLevel}/5</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <button
          onClick={handleGenerateTwin}
          disabled={!canGenerate || isGenerating}
          className="btn-primary w-full py-5 tracking-widest mt-8"
        >
          {isGenerating ? 'Generating Twin...' : 'Generate Twin OS'}
        </button>
      </div>
    </div>
  );
};

export default NommoPanel;
