import React, { useState, useEffect, useCallback } from 'react';
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
import DriftPanel from './DriftPanel';

// Archetype designation → glyph name + Greek symbol + full relational data
// This is the single source of truth for archetype metadata.
// Other apps (Qualn, Crucibla, etc.) can query a user's designation via
// Subtaste API and look up relational data from their own copy of this map.
const GLYPH_MAP = {
  'S-0': {
    glyph: 'KETH', symbol: 'Θ',
    essence: 'The unmarked throne. First without announcement.',
    creativeMode: 'Visionary',
    shadow: 'Paralysis by standard. Nothing meets the mark.',
    recogniseBy: 'Others unconsciously defer to their judgment. They rarely explain themselves.',
    strengths: ['Standard-setting', 'Quality judgment', 'Direction without persuasion'],
    roles: ['Creative director', 'Taste authority', 'Brand guardian'],
    avoidTasking: 'Operational detail, democratic decision-making, public justification',
    collaboratesWith: ['F-9', 'T-1'],
    collaboratesWhy: 'Anvil executes your vision. Strata builds the architecture you need.',
    tensionWith: ['R-10'],
    tensionWhy: 'Schism challenges your authority, but their friction sharpens your standards.',
    avoidWith: ['H-6'],
    avoidWhy: 'Toll shares indiscriminately what you curate silently.',
    growthToward: 'N-5',
    growthWhy: 'Learning to connect rather than judge. Your standards gain reach when you bridge.',
  },
  'T-1': {
    glyph: 'STRATA', symbol: 'Σ',
    essence: 'The hidden architecture. Layers beneath surfaces.',
    creativeMode: 'Architectural',
    shadow: 'Over-engineering. The system becomes the end.',
    recogniseBy: 'They explain systems you did not know existed.',
    strengths: ['Systems design', 'Pattern recognition', 'Infrastructure thinking'],
    roles: ['Strategist', 'Platform architect', 'Catalogue designer'],
    avoidTasking: 'Improvisation, rapid prototyping without structure, ambiguity tolerance',
    collaboratesWith: ['S-0', 'N-5'],
    collaboratesWhy: 'Keth provides the vision your systems serve. Limn connects your structures to broader networks.',
    tensionWith: ['D-8'],
    tensionWhy: 'Wick operates by instinct where you demand logic, but their intuition finds what your systems miss.',
    avoidWith: ['C-4'],
    avoidWhy: 'Cull reduces what you build. Their elimination instinct can dismantle your architecture.',
    growthToward: 'D-8',
    growthWhy: 'Learning to trust intuition alongside structure. Not everything needs a system.',
  },
  'V-2': {
    glyph: 'OMEN', symbol: 'Δ',
    essence: 'What arrives before itself. The shape of the unformed.',
    creativeMode: 'Prophetic',
    shadow: 'Cassandra syndrome. Right too soon.',
    recogniseBy: 'Their recommendations age well. Years later, you remember what they said.',
    strengths: ['Trend forecasting', 'Early signal detection', 'Temporal taste'],
    roles: ['Scout', 'A&R (early-stage)', 'Trend analyst', 'Futures researcher'],
    avoidTasking: 'Execution under deadline, operational shipping, consensus building',
    collaboratesWith: ['L-3', 'P-7'],
    collaboratesWhy: 'Silt has the patience to wait for your predictions to land. Vault provides the deep references that validate your foresight.',
    tensionWith: ['F-9'],
    tensionWhy: 'Anvil wants to ship now while you see further ahead, but their urgency gives your vision a deadline.',
    avoidWith: ['H-6'],
    avoidWhy: 'Toll shares prematurely what you sense should be held until the timing is right.',
    growthToward: 'F-9',
    growthWhy: 'Learning to act on your foresight. Seeing is not enough. Prophecy needs form.',
  },
  'L-3': {
    glyph: 'SILT', symbol: 'Λ',
    essence: 'What remains after the river passes. The patient residue.',
    creativeMode: 'Curatorial',
    shadow: 'Endless patience becomes enabling.',
    recogniseBy: 'Long memory. They remember what you showed them three years ago.',
    strengths: ['Long-term curation', 'Cultural memory', 'Contextual depth'],
    roles: ['Curator', 'Archivist', 'Catalogue manager', 'Heritage consultant'],
    avoidTasking: 'Fast-turnaround projects, trend-chasing, disposable content',
    collaboratesWith: ['V-2', 'P-7'],
    collaboratesWhy: 'Omen sees what is coming. Vault guards what has been. Together with you, nothing is lost.',
    tensionWith: ['F-9'],
    tensionWhy: 'Anvil moves fast and breaks what you preserve, but their output gives you new material to curate.',
    avoidWith: ['R-10'],
    avoidWhy: 'Schism fractures the continuity you maintain.',
    growthToward: 'H-6',
    growthWhy: 'Learning to share what you have gathered. Curation without transmission is a private museum.',
  },
  'C-4': {
    glyph: 'CULL', symbol: 'Ξ',
    essence: 'To know what must be removed. Taste by elimination.',
    creativeMode: 'Reductive',
    shadow: 'Nihilistic rejection. Nothing survives.',
    recogniseBy: 'Sparse playlists. Brutal honesty.',
    strengths: ['Editorial judgment', 'Quality control', 'Brand discipline'],
    roles: ['Editor', 'Gatekeeper', 'QA lead', 'Playlist curator'],
    avoidTasking: 'Open brainstorming, generative workshops, saying yes',
    collaboratesWith: ['Ø', 'S-0'],
    collaboratesWhy: 'Void understands removal as creation. Keth shares your high standards.',
    tensionWith: ['P-7'],
    tensionWhy: 'Vault hoards what you would cut, but their archive reminds you what should have survived.',
    avoidWith: ['H-6'],
    avoidWhy: 'Toll shares everything. You eliminate everything. Neither meets the other.',
    growthToward: 'L-3',
    growthWhy: 'Learning that some things deserve to stay. Patience before the cut.',
  },
  'N-5': {
    glyph: 'LIMN', symbol: 'Φ',
    essence: 'To illuminate by edge. The binding outline.',
    creativeMode: 'Connective',
    shadow: 'Pathological balance. Refuses to choose.',
    recogniseBy: 'Unexpected pairings that work. Playlists that should not cohere but do.',
    strengths: ['Cross-pollination', 'Bridging genres and scenes', 'Creative direction'],
    roles: ['Creative director', 'A&R', 'Sync supervisor', 'Brand collaborator'],
    avoidTasking: 'Single-lane focus, binary elimination, choosing one side',
    collaboratesWith: ['T-1', 'D-8'],
    collaboratesWhy: 'Strata provides structure for your connections. Wick channels what you link intuitively.',
    tensionWith: ['C-4'],
    tensionWhy: 'Cull eliminates the bridges you build, but their cuts reveal which connections were real.',
    avoidWith: ['S-0'],
    avoidWhy: 'Keth resists being connected to things beneath their standard.',
    growthToward: 'C-4',
    growthWhy: 'Learning to choose. Not all connections are worth making. Strength through selection.',
  },
  'H-6': {
    glyph: 'TOLL', symbol: 'Ψ',
    essence: 'What must be paid to pass. The cost of transmission.',
    creativeMode: 'Evangelical',
    shadow: 'Missionary zeal. Sharing becomes shoving.',
    recogniseBy: 'Relentless enthusiasm. They have sent you the same link three times.',
    strengths: ['Audience building', 'Community activation', 'Cultural transmission'],
    roles: ['Community manager', 'Promoter', 'Playlist evangelist', 'Culture writer'],
    avoidTasking: 'Restraint, secrecy, holding information back, silent curation',
    collaboratesWith: ['F-9', 'V-2'],
    collaboratesWhy: 'Anvil makes things worth sharing. Omen finds them before anyone else.',
    tensionWith: ['P-7'],
    tensionWhy: 'Vault guards what you want to share, but their gatekeeping ensures only worthy things circulate.',
    avoidWith: ['C-4'],
    avoidWhy: 'Cull eliminates what you amplify. Your energy exhausts their restraint.',
    growthToward: 'P-7',
    growthWhy: 'Learning when not to share. Restraint makes your signal stronger.',
  },
  'P-7': {
    glyph: 'VAULT', symbol: 'Π',
    essence: 'What is kept below the surface. The guarded archive.',
    creativeMode: 'Archival',
    shadow: 'Hoarding. Knowledge that never circulates.',
    recogniseBy: 'They cite sources you have never heard of.',
    strengths: ['Deep research', 'Reference networks', 'Knowledge preservation'],
    roles: ['Research lead', 'Sample digger', 'Reference curator', 'Music librarian'],
    avoidTasking: 'Rapid sharing, public-facing promotion, trend commentary',
    collaboratesWith: ['L-3', 'T-1'],
    collaboratesWhy: 'Silt shares your long memory. Strata builds systems to organise your archive.',
    tensionWith: ['H-6'],
    tensionWhy: 'Toll wants to share everything you guard, but their reach gives your knowledge an audience.',
    avoidWith: ['C-4'],
    avoidWhy: 'Cull would reduce your archive to ashes.',
    growthToward: 'H-6',
    growthWhy: 'Learning to release. Knowledge guarded forever is knowledge that dies with you.',
  },
  'D-8': {
    glyph: 'WICK', symbol: 'Ω',
    essence: 'The drawn line that feeds the flame. Channel and fuel.',
    creativeMode: 'Channelling',
    shadow: 'Dissolution. The channel consumes the self.',
    recogniseBy: 'Uncanny recommendations. They cannot always explain why.',
    strengths: ['Intuitive discovery', 'Mood curation', 'Instinctive A&R'],
    roles: ['DJ', 'Mood curator', 'Intuitive A&R', 'Sonic designer'],
    avoidTasking: 'Systematic analysis, written justification, process documentation',
    collaboratesWith: ['N-5', 'Ø'],
    collaboratesWhy: 'Limn gives structure to your intuitions. Void receives what you channel without distortion.',
    tensionWith: ['T-1'],
    tensionWhy: 'Strata demands logic where you operate by instinct, but their frameworks give your signal durability.',
    avoidWith: ['S-0'],
    avoidWhy: 'Keth demands explanation you cannot always provide.',
    growthToward: 'T-1',
    growthWhy: 'Learning to build containers for what you channel. Instinct needs architecture to survive.',
  },
  'F-9': {
    glyph: 'ANVIL', symbol: 'Γ',
    essence: 'Where force meets form. The shaping surface.',
    creativeMode: 'Generative',
    shadow: 'Crude materialism. Only what ships matters.',
    recogniseBy: 'They have built something. While others talked, they shipped.',
    strengths: ['Execution', 'Rapid prototyping', 'Production discipline'],
    roles: ['Producer', 'Release manager', 'Project lead', 'Content creator'],
    avoidTasking: 'Long deliberation, theoretical planning, waiting for perfect timing',
    collaboratesWith: ['H-6', 'S-0'],
    collaboratesWhy: 'Toll amplifies what you make. Keth sets the standard your work should reach.',
    tensionWith: ['V-2'],
    tensionWhy: 'Omen says wait while you want to ship, but their timing prevents premature releases.',
    avoidWith: ['Ø'],
    avoidWhy: 'Void receives passively where you demand action.',
    growthToward: 'V-2',
    growthWhy: 'Learning to wait. Not everything should ship immediately. Timing is a material.',
  },
  'R-10': {
    glyph: 'SCHISM', symbol: 'Ϟ',
    essence: 'The productive fracture. Where division creates.',
    creativeMode: 'Contrarian',
    shadow: 'Reflexive opposition. Disagreement as identity.',
    recogniseBy: 'Their takes age strangely. What seemed wrong becomes obvious.',
    strengths: ['Critical thinking', 'Genre disruption', 'Counter-positioning'],
    roles: ['Critic', 'Devil\u2019s advocate', 'Anti-A&R', 'Subculture pioneer'],
    avoidTasking: 'Consensus-building, brand alignment, diplomatic communication',
    collaboratesWith: ['V-2', 'C-4'],
    collaboratesWhy: 'Omen sees differently too. Cull shares your willingness to reject.',
    tensionWith: ['S-0'],
    tensionWhy: 'Keth sets standards you instinctively challenge, but their authority tests whether your dissent has substance.',
    avoidWith: ['L-3'],
    avoidWhy: 'Silt preserves the continuity you fracture.',
    growthToward: 'L-3',
    growthWhy: 'Learning that some things should not be broken. Patience before the fracture.',
  },
  'Ø': {
    glyph: 'VOID', symbol: 'Ø',
    essence: 'The space that allows everything else. Receptive emptiness.',
    creativeMode: 'Receptive',
    shadow: 'Passivity. Reception without response.',
    recogniseBy: 'They listen longer than anyone. Their recommendations feel like mirrors.',
    strengths: ['Deep listening', 'Spatial awareness', 'Environmental design'],
    roles: ['Listening room designer', 'Sound therapist', 'Ambient curator', 'Safe space holder'],
    avoidTasking: 'Rapid output, aggressive promotion, competitive environments',
    collaboratesWith: ['D-8', 'C-4'],
    collaboratesWhy: 'Wick channels into the space you hold. Cull understands that emptiness is not absence.',
    tensionWith: ['F-9'],
    tensionWhy: 'Anvil demands output where you offer space, but their urgency pulls form from your silence.',
    avoidWith: ['H-6'],
    avoidWhy: 'Toll fills every space you create.',
    growthToward: 'F-9',
    growthWhy: 'Learning to generate. Reception without expression leaves no trace.',
  },
};

// Mode descriptions — what each creative mode means in practice
const MODE_DESC = {
  Visionary: 'Sets standards others follow without explaining why.',
  Architectural: 'Builds hidden systems beneath the surface of things.',
  Prophetic: 'Identifies what matters before consensus forms.',
  Curatorial: 'Preserves and resurfaces what others have forgotten.',
  Reductive: 'Knows what to remove. Taste expressed through elimination.',
  Connective: 'Draws unexpected links between things that should not cohere.',
  Evangelical: 'Compelled to transmit. The cost of knowing is sharing.',
  Archival: 'Guards deep knowledge. References others cannot access.',
  Channelling: 'Receives and transmits signal without always knowing the source.',
  Generative: 'Shapes raw material into form. Ships while others theorise.',
  Contrarian: 'Productive disagreement. Fractures that create new paths.',
  Receptive: 'Creates space for others. Taste expressed through listening.',
};

const NommoPanel = ({ onTwinGenerated, onGlowChange }) => {
  const [caption, setCaption] = useState('');
  const [bio, setBio] = useState('');
  const [glowLevel, setGlowLevel] = useState(3);
  const [tizitaData, setTizitaData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectingTizita, setConnectingTizita] = useState(false);
  const [rescanningTizita, setRescanningTizita] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState('personal');
  const [usageInfo, setUsageInfo] = useState(null);
  const [totalTracks, setTotalTracks] = useState(null);
  const [projectDnaData, setProjectDnaData] = useState(null);
  const [subtasteData, setSubtasteData] = useState(null);
  const [subtasteConnecting, setSubtasteConnecting] = useState(false);
  const [rescanningSubtaste, setRescanningSubtaste] = useState(false);
  const [subtasteSource, setSubtasteSource] = useState(null);
  const [subtasteStagesCompleted, setSubtasteStagesCompleted] = useState([]);
  const [subtasteUserIdRef, setSubtasteUserIdRef] = useState(null);
  const [writingDnaData, setWritingDnaData] = useState(null);
  const [connectingWritingDna, setConnectingWritingDna] = useState(false);
  const [rescanningWritingDna, setRescanningWritingDna] = useState(false);
  const [narrative, setNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeStale, setNarrativeStale] = useState(false);
  const [driftTimeline, setDriftTimeline] = useState([]);
  const [driftData, setDriftData] = useState(null);
  const [driftSeason, setDriftSeason] = useState(null);
  const [convictionData, setConvictionData] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | error
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [showArchetypeDetails, setShowArchetypeDetails] = useState(false);
  const [expandedDesignation, setExpandedDesignation] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null); // 'mode' | 'shadow' | 'growth' | null

  // --- Auto-connect on mount ---
  useEffect(() => {
    fetchSubscriptionStatus();
    fetchTotalTracks();
    fetchCachedProjectDNA();

    // 1. Load cached genome (instant)
    fetchCachedGenome();

    // 2. Auto-connect Tizita (background)
    autoConnectTizita();

    // 3. Handle URL params from quiz redirect
    handleUrlParams();

    // 4. Auto-connect WritingDNA from Ibis
    fetchWritingDna();

    // 5. Fetch cached narrative
    fetchNarrative();

    // 6. Fetch drift data
    fetchDriftData();

    // 7. Fetch conviction weights
    fetchConvictionData();
  }, []);

  // --- URL param handling (quiz callback) ---
  const handleUrlParams = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const subtasteUserId = params.get('subtaste_user_id');

    if (subtasteUserId) {
      // Link and fetch genome
      try {
        const response = await axios.post('/api/subtaste/genome/default_user/link', {
          subtaste_user_id: subtasteUserId,
        });
        if (response.data.success && response.data.genome) {
          setSubtasteData(response.data.genome?.archetype || response.data.genome);
          setSubtasteSource('quiz');
        }
      } catch (err) {
        console.error('Failed to link subtaste user:', err);
      }

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // --- Cached genome fetch (instant load) + background sync ---
  const fetchCachedGenome = async () => {
    try {
      const response = await axios.get('/api/subtaste/genome/default_user/cached');
      if (response.data.success && response.data.genome) {
        setSubtasteData(response.data.genome?.archetype || response.data.genome);
        setSubtasteSource(response.data.source || 'cache');
        if (response.data.stagesCompleted) {
          setSubtasteStagesCompleted(response.data.stagesCompleted);
        }
        if (response.data.subtasteUserId) {
          setSubtasteUserIdRef(response.data.subtasteUserId);
        }
        setLastSyncTime(response.data.cachedAt);

        // Background sync: fetch fresh data from Subtaste to update cache
        syncFromSubtaste(response.data.subtasteUserId);

        return true;
      }
    } catch {
      // No cache available
    }

    // Fall back to auto-classification
    fetchAutoClassification();
    return false;
  };

  // --- Background sync with Subtaste (updates cache + UI) ---
  const syncFromSubtaste = async (subtasteUserId) => {
    if (!subtasteUserId) return;
    setSyncStatus('syncing');
    try {
      const response = await axios.post('/api/subtaste/genome/default_user/rescan', {
        subtaste_user_id: subtasteUserId,
      });
      if (response.data.success && response.data.genome) {
        setSubtasteData(response.data.genome?.archetype || response.data.genome);
        setSubtasteSource(response.data.source || 'quiz');
        setLastSyncTime(new Date().toISOString());
        setSyncStatus('synced');
      } else {
        setSyncStatus('synced'); // Cache is still valid
      }
    } catch {
      setSyncStatus('error');
    }
  };

  // --- Drift Detection ---
  const fetchDriftData = async () => {
    try {
      const [timelineRes, driftRes, seasonRes] = await Promise.all([
        axios.get('/api/identity/timeline/default_user'),
        axios.get('/api/identity/drift/default_user?window=90'),
        axios.get('/api/identity/season/default_user'),
      ]);

      if (timelineRes.data?.success) setDriftTimeline(timelineRes.data.timeline || []);
      if (driftRes.data?.success) setDriftData(driftRes.data.drift || null);
      if (seasonRes.data?.success) setDriftSeason(seasonRes.data.season || null);
    } catch (err) {
      console.error('Failed to fetch drift data:', err);
    }
  };

  // --- Conviction Weights ---
  const fetchConvictionData = async () => {
    try {
      const res = await axios.get('/api/identity/conviction/default_user');
      if (res.data?.success) {
        setConvictionData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch conviction data:', err);
    }
  };

  // --- Identity Narrative ---
  const fetchNarrative = async () => {
    try {
      const res = await axios.get('/api/identity/narrative/default_user');
      if (res.data?.success && res.data?.hasNarrative) {
        setNarrative(res.data.narrative);
        setNarrativeStale(res.data.isStale || false);
      }
    } catch (err) {
      console.error('Failed to fetch narrative:', err);
    }
  };

  const generateNarrative = async () => {
    setNarrativeLoading(true);
    try {
      const res = await axios.post('/api/identity/narrative/default_user');
      if (res.data?.success) {
        setNarrative(res.data.narrative);
        setNarrativeStale(false);
      }
    } catch (err) {
      console.error('Failed to generate narrative:', err);
    } finally {
      setNarrativeLoading(false);
    }
  };

  // --- WritingDNA from Ibis ---
  const fetchWritingDna = async () => {
    setConnectingWritingDna(true);
    try {
      const res = await axios.get('/api/writing-dna/ibis/default_user');
      if (res.data?.success && res.data?.connected) {
        setWritingDnaData(res.data.writingDNA);
      }
    } catch (err) {
      console.error('Failed to fetch WritingDNA:', err);
    } finally {
      setConnectingWritingDna(false);
    }
  };

  const handleRescanWritingDna = async () => {
    setRescanningWritingDna(true);
    try {
      const res = await axios.post('/api/writing-dna/ibis/default_user/sync');
      if (res.data?.success && res.data?.synced) {
        setWritingDnaData(res.data.writingDNA);
      }
    } catch (err) {
      console.error('Failed to rescan WritingDNA:', err);
    } finally {
      setRescanningWritingDna(false);
    }
  };

  // --- Auto-connect Tizita (runs on mount, no button click needed) ---
  const autoConnectTizita = async () => {
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
      console.log('Tizita auto-connect unavailable:', error.message);
      // Don't set error state on auto-connect — just leave null
    } finally {
      setConnectingTizita(false);
    }
  };

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
        // Only set auto-classification if no quiz data is loaded
        setSubtasteData(prev => {
          if (prev) return prev; // Don't overwrite quiz data
          return response.data.classification;
        });
        setSubtasteSource(prev => prev || 'auto');
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
        setSubtasteSource(response.data.source || 'quiz');
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 503) {
        const quizUrl = process.env.REACT_APP_SUBTASTE_URL || 'http://localhost:3001';
        const callback = encodeURIComponent(window.location.origin + '/');
        window.location.href = `${quizUrl}/quiz?callback=${callback}`;
      }
    } finally {
      setSubtasteConnecting(false);
    }
  };

  // --- Rescan handlers ---

  const handleRescanSubtaste = async () => {
    setRescanningSubtaste(true);
    setSyncStatus('syncing');
    try {
      const response = await axios.post('/api/subtaste/genome/default_user/rescan');
      if (response.data.success && response.data.genome) {
        setSubtasteData(response.data.genome?.archetype || response.data.genome);
        setSubtasteSource('quiz');
        setLastSyncTime(new Date().toISOString());
        setSyncStatus('synced');
      }
    } catch (err) {
      console.error('Subtaste rescan failed:', err);
      setSyncStatus('error');
    } finally {
      setRescanningSubtaste(false);
    }
  };

  const handleRescanTizita = async () => {
    setRescanningTizita(true);
    try {
      const [profileRes, photosRes, dnaRes] = await Promise.all([
        axios.get('/api/deep/tizita/profile'),
        axios.get('/api/deep/tizita/top-photos', {
          params: { limit: 500, minScore: 0 }
        }),
        axios.get('/api/deep/tizita/visual-dna', {
          params: { refresh: 'true' }
        }),
      ]);

      setTizitaData({
        profile: profileRes.data.profile,
        photos: photosRes.data.photos,
        visualDNA: dnaRes.data.visualDNA
      });

      fetchAutoClassification();
    } catch (error) {
      console.error('Tizita rescan failed:', error);
    } finally {
      setRescanningTizita(false);
    }
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

  const handleProjectDnaScanComplete = (projectDNA) => {
    setProjectDnaData(projectDNA);
    fetchAutoClassification();
  };

  const handleGlowChange = (e) => {
    const level = parseInt(e.target.value);
    setGlowLevel(level);
    onGlowChange?.(level);
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
  const titleCase = (s) => s ? s.charAt(0) + s.slice(1).toLowerCase() : '';
  const hasVisualDNA = !!tizitaData && !tizitaData.error;
  const isInitialLoading = connectingTizita && !hasVisualDNA && !subtasteData;

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
  const hasAudioDNA = totalTracks > 0;
  const hasLineage = !!projectDnaData;
  const nothingConnected = !subtasteData && !hasVisualDNA && !hasAudioDNA && !hasLineage;

  return (
    <div>
      {/* Zone 1: Page Title + Sync Status */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-display-xl text-brand-text">Nommo</h1>
        <div className="flex items-center gap-2" title={lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleString()}` : 'Not synced'}>
          <span
            className={`w-2 h-2 rounded-full ${
              syncStatus === 'synced' ? 'bg-green-500' :
              syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' :
              syncStatus === 'error' ? 'bg-red-500' :
              'bg-brand-border'
            }`}
          />
          <span className="text-body-sm text-brand-secondary font-mono">
            {syncStatus === 'syncing' ? 'Syncing' :
             syncStatus === 'synced' ? 'Synced' :
             syncStatus === 'error' ? 'Offline' :
             ''}
          </span>
        </div>
      </div>
      {isInitialLoading ? (
        <div className="flex items-center gap-3 mb-16">
          <div className="w-4 h-4 border-2 border-brand-border border-t-brand-text rounded-full animate-spin" />
          <p className="text-body text-brand-secondary">Loading identity data...</p>
        </div>
      ) : nothingConnected ? (
        <p className="text-body text-brand-secondary mb-16">
          Connect your creative catalogs to summon your Twin.
        </p>
      ) : (
        <div className="mb-16" />
      )}

      {/* Identity Narrative (Nommo — the power of the word) */}
      {(narrative || narrativeLoading) && (
        <div className="border border-brand-text p-8 mb-12">
          <div className="flex items-center justify-between mb-4">
            <p className="uppercase-label text-brand-secondary">Identity Portrait</p>
            <div className="flex items-center gap-3">
              {narrativeStale && !narrativeLoading && (
                <span className="text-label text-brand-secondary">Signals changed</span>
              )}
              <button
                onClick={generateNarrative}
                disabled={narrativeLoading}
                className="btn-secondary text-label px-3 py-1"
              >
                {narrativeLoading ? 'Generating...' : narrativeStale ? 'Regenerate' : 'Regenerate'}
              </button>
            </div>
          </div>

          {narrativeLoading && !narrative ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-brand-border rounded w-full" />
              <div className="h-4 bg-brand-border rounded w-5/6" />
              <div className="h-4 bg-brand-border rounded w-4/6" />
              <div className="h-4 bg-brand-border rounded w-full mt-4" />
              <div className="h-4 bg-brand-border rounded w-3/4" />
            </div>
          ) : (
            <div className="font-display text-body leading-relaxed text-brand-text whitespace-pre-line">
              {narrative}
            </div>
          )}
        </div>
      )}

      {/* Generate first narrative prompt (only if no narrative exists and signals connected) */}
      {!narrative && !narrativeLoading && (subtasteData || tizitaData || totalTracks) && (
        <div className="border border-dashed border-brand-border p-6 mb-12 text-center">
          <p className="text-body text-brand-secondary mb-3">
            Your identity signals are ready. Generate your portrait.
          </p>
          <button
            onClick={generateNarrative}
            className="btn-primary text-label px-6 py-2"
          >
            Speak Identity Into Existence
          </button>
        </div>
      )}

      {/* Identity Drift (only shows with > 1 snapshot) */}
      <DriftPanel
        drift={driftData}
        timeline={driftTimeline}
        season={driftSeason}
      />

      {/* Conviction Quality Badge */}
      {convictionData && (
        <div className="flex items-center justify-between mb-4">
          <p className="uppercase-label text-brand-secondary">Identity Signals</p>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Object.entries(convictionData.weights || {}).map(([key, w]) => (
                <div
                  key={key}
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: w.present
                      ? `rgba(10, 10, 10, ${0.3 + w.conviction * 0.7})`
                      : '#E0E0E0',
                  }}
                  title={`${key}: ${w.present ? `${(w.conviction * 100).toFixed(0)}% conviction` : 'not connected'}`}
                />
              ))}
            </div>
            <span className="text-label text-brand-secondary">
              {convictionData.qualityScore}% verified
            </span>
          </div>
        </div>
      )}

      {/* Zone 2: Hub Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">

        {/* Card 1 — Taste Archetype */}
        <HubCard
          label="Taste Archetype"
          stat={subtasteData ? titleCase(subtasteData?.primary?.glyph || subtasteData?.glyph || subtasteData?.primary?.designation || subtasteData?.designation || '') : null}
          statLabel={
            subtasteData
              ? subtasteData.primary?.creativeMode || subtasteData.creativeMode || null
              : null
          }
          connected={!!subtasteData}
          onConnect={handleConnectSubtaste}
          connectLabel={subtasteConnecting ? 'Connecting...' : 'Connect Subtaste'}
          onRescan={subtasteSource === 'quiz' ? handleRescanSubtaste : undefined}
          rescanning={rescanningSubtaste}
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
                  <span className="text-display-sm">{GLYPH_MAP[subtasteData.primary?.designation]?.symbol || subtasteData.primary?.symbol || ''}</span>
                  <div>
                    <p className="text-body text-brand-text font-medium">
                      {titleCase(subtasteData.primary?.glyph || subtasteData.glyph || '')}
                    </p>
                    <p className="text-body-sm text-brand-secondary">
                      {subtasteData.primary?.creativeMode || subtasteData.creativeMode || ''}
                    </p>
                  </div>
                  {(subtasteData.primary?.confidence || subtasteData.confidence) > 0.01 && (
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
                      <span className="text-brand-text font-mono">{GLYPH_MAP[subtasteData.secondary.designation]?.symbol || subtasteData.secondary.symbol || ''}</span>
                      <span className="text-brand-text">{titleCase(subtasteData.secondary.glyph || GLYPH_MAP[subtasteData.secondary.designation]?.glyph || '')}</span>
                      <span className="text-brand-secondary">{subtasteData.secondary.creativeMode}</span>
                      {subtasteData.secondary.confidence > 0.01 && (
                        <span className="ml-auto font-mono text-brand-secondary">
                          {Math.round(subtasteData.secondary.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                  {subtasteData.tertiary && (
                    <div className="flex items-center gap-2 text-body-sm border border-brand-border p-3 opacity-70">
                      <span className="text-brand-text font-mono">{GLYPH_MAP[subtasteData.tertiary.designation]?.symbol || subtasteData.tertiary.symbol || ''}</span>
                      <span className="text-brand-text">{titleCase(subtasteData.tertiary.glyph || GLYPH_MAP[subtasteData.tertiary.designation]?.glyph || '')}</span>
                      <span className="text-brand-secondary">{subtasteData.tertiary.creativeMode}</span>
                      {subtasteData.tertiary.confidence > 0.01 && (
                        <span className="ml-auto font-mono text-brand-secondary">
                          {Math.round(subtasteData.tertiary.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Archetype Summary: clean, clear, not overwhelming */}
              {(() => {
                const primaryD = subtasteData.primary?.designation || subtasteData.designation;
                const secondaryD = subtasteData.secondary?.designation;
                const primaryInfo = GLYPH_MAP[primaryD];
                const secondaryInfo = secondaryD ? GLYPH_MAP[secondaryD] : null;

                const sortedDist = subtasteData.distribution
                  ? Object.entries(subtasteData.distribution).sort(([, a], [, b]) => b - a)
                  : [];

                // Growth: defined per archetype (who you naturally develop toward)
                const growthD = primaryInfo?.growthToward;
                const growthInfo = growthD ? GLYPH_MAP[growthD] : null;

                return (
                  <div className="space-y-4">
                    {/* Core: Dominant + Subdominant + Mode + Shadow + Growth */}
                    <div className="space-y-1 text-body-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-brand-secondary">Dominant</span>
                        <span className="text-brand-text">{primaryInfo?.symbol} {titleCase(primaryInfo?.glyph)}</span>
                      </div>
                      {secondaryInfo && (
                        <div className="flex justify-between py-1">
                          <span className="text-brand-secondary">Subdominant</span>
                          <span className="text-brand-text">{secondaryInfo?.symbol} {titleCase(secondaryInfo?.glyph)}</span>
                        </div>
                      )}
                      {/* Mode — tappable */}
                      <div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedRow(expandedRow === 'mode' ? null : 'mode'); }}
                          className="flex justify-between w-full py-1 text-left"
                        >
                          <span className="text-brand-secondary">Mode</span>
                          <span className="text-brand-text underline decoration-brand-border">{primaryInfo?.creativeMode}</span>
                        </button>
                        {expandedRow === 'mode' && (
                          <p className="text-body-sm text-brand-secondary pl-2 pb-1">{MODE_DESC[primaryInfo?.creativeMode] || ''}</p>
                        )}
                      </div>
                      {/* Shadow — tappable */}
                      <div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedRow(expandedRow === 'shadow' ? null : 'shadow'); }}
                          className="flex justify-between w-full py-1 text-left"
                        >
                          <span className="text-brand-secondary">Shadow</span>
                          <span className="text-brand-text underline decoration-brand-border">{primaryInfo?.shadow?.split('.')[0]}</span>
                        </button>
                        {expandedRow === 'shadow' && (
                          <p className="text-body-sm text-brand-secondary pl-2 pb-1">The risk when your dominant trait overextends. {primaryInfo?.shadow?.split('.').slice(1).join('.').trim()}</p>
                        )}
                      </div>
                      {/* Complement — the archetype that balances your blind spots */}
                      {growthInfo && (
                        <div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedRow(expandedRow === 'growth' ? null : 'growth'); }}
                            className="flex justify-between w-full py-1 text-left"
                          >
                            <span className="text-brand-secondary">Complement</span>
                            <span className="text-brand-text underline decoration-brand-border">{growthInfo.symbol} {titleCase(growthInfo.glyph)}</span>
                          </button>
                          {expandedRow === 'growth' && (
                            <p className="text-body-sm text-brand-secondary pl-2 pb-1">{primaryInfo?.growthWhy}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Essence */}
                    <p className="text-body-sm text-brand-secondary italic border-t border-brand-border pt-3">
                      {primaryInfo?.essence}
                    </p>

                    {/* See more toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowArchetypeDetails(!showArchetypeDetails); }}
                      className="text-body-sm text-brand-text underline"
                    >
                      {showArchetypeDetails ? 'See less' : 'See more'}
                    </button>

                    {showArchetypeDetails && (
                      <div className="space-y-4 border-t border-brand-border pt-3">
                        {/* Recognise By */}
                        {primaryInfo?.recogniseBy && (
                          <div>
                            <p className="uppercase-label text-brand-secondary mb-1">Recognise by</p>
                            <p className="text-body-sm text-brand-secondary">{primaryInfo.recogniseBy}</p>
                          </div>
                        )}

                        {/* Strengths + Roles */}
                        {primaryInfo?.strengths?.length > 0 && (
                          <div>
                            <p className="uppercase-label text-brand-secondary mb-1">Strengths</p>
                            <p className="text-body-sm text-brand-text">{primaryInfo.strengths.join(', ')}</p>
                          </div>
                        )}
                        {primaryInfo?.roles?.length > 0 && (
                          <div>
                            <p className="uppercase-label text-brand-secondary mb-1">Natural roles</p>
                            <p className="text-body-sm text-brand-text">{primaryInfo.roles.join(', ')}</p>
                          </div>
                        )}
                        {primaryInfo?.avoidTasking && (
                          <div>
                            <p className="uppercase-label text-brand-secondary mb-1">Avoid tasking with</p>
                            <p className="text-body-sm text-brand-secondary">{primaryInfo.avoidTasking}</p>
                          </div>
                        )}

                        {/* Collaborate */}
                        {primaryInfo?.collaboratesWith?.length > 0 && (
                          <div>
                            <p className="uppercase-label text-brand-secondary mb-1">Collaborate with</p>
                            <p className="text-body-sm text-brand-text mb-1">
                              {primaryInfo.collaboratesWith.map(d => `${GLYPH_MAP[d]?.symbol} ${titleCase(GLYPH_MAP[d]?.glyph)}`).join(', ')}
                            </p>
                            <p className="text-body-sm text-brand-secondary">{primaryInfo.collaboratesWhy}</p>
                          </div>
                        )}

                        {/* Productive tension */}
                        {primaryInfo?.tensionWith?.length > 0 && (
                          <div>
                            <p className="uppercase-label text-brand-secondary mb-1">Productive tension</p>
                            <p className="text-body-sm text-brand-text mb-1">
                              {primaryInfo.tensionWith.map(d => `${GLYPH_MAP[d]?.symbol} ${titleCase(GLYPH_MAP[d]?.glyph)}`).join(', ')}
                            </p>
                            <p className="text-body-sm text-brand-secondary">{primaryInfo.tensionWhy}</p>
                          </div>
                        )}

                        {/* Avoid */}
                        {primaryInfo?.avoidWith?.length > 0 && (
                          <div>
                            <p className="uppercase-label text-brand-secondary mb-1">Friction</p>
                            <p className="text-body-sm text-brand-text mb-1">
                              {primaryInfo.avoidWith.map(d => `${GLYPH_MAP[d]?.symbol} ${titleCase(GLYPH_MAP[d]?.glyph)}`).join(', ')}
                            </p>
                            <p className="text-body-sm text-brand-secondary">{primaryInfo.avoidWhy}</p>
                          </div>
                        )}

                        {/* Complement — the archetype that balances your blind spots */}
                        {growthInfo && (
                          <div>
                            <p className="uppercase-label text-brand-secondary mb-1">Complement</p>
                            <p className="text-body-sm text-brand-text mb-1">{growthInfo.symbol} {titleCase(growthInfo.glyph)}</p>
                            <p className="text-body-sm text-brand-secondary">{primaryInfo?.growthWhy}</p>
                          </div>
                        )}

                        {/* Full shadow detail */}
                        <div>
                          <p className="uppercase-label text-brand-secondary mb-1">Shadow (full)</p>
                          <p className="text-body-sm text-brand-secondary">{primaryInfo?.shadow}</p>
                        </div>

                        {/* Subdominant detail */}
                        {secondaryInfo && (
                          <div>
                            <p className="uppercase-label text-brand-secondary mb-1">Subdominant shadow</p>
                            <p className="text-body-sm text-brand-secondary">{secondaryInfo.shadow}</p>
                          </div>
                        )}

                        {/* Distribution — clickable items */}
                        {subtasteData.distribution && (
                          <div>
                            <p className="uppercase-label text-brand-secondary mb-2">Distribution</p>
                            <div className="space-y-1">
                              {sortedDist
                                .slice(0, 6)
                                .map(([designation, weight]) => {
                                  const info = GLYPH_MAP[designation];
                                  const isExpanded = expandedDesignation === designation;
                                  return (
                                    <div key={designation}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedDesignation(isExpanded ? null : designation);
                                        }}
                                        className="flex items-center gap-2 w-full text-left hover:bg-void-subtle transition-colors py-0.5"
                                      >
                                        <span className="text-body-sm text-brand-text font-mono w-20">{info?.symbol || ''} {titleCase(info?.glyph || designation)}</span>
                                        <div className="flex-1 h-2 bg-brand-border">
                                          <div className="h-2 bg-brand-text" style={{ width: `${Math.round(weight * 100)}%` }} />
                                        </div>
                                        <span className="text-body-sm text-brand-secondary font-mono w-10 text-right">{Math.round(weight * 100)}%</span>
                                      </button>
                                      {isExpanded && info && (
                                        <div className="ml-4 pl-4 border-l border-brand-border py-2 space-y-1">
                                          <p className="text-body-sm text-brand-secondary italic">{info.essence}</p>
                                          <p className="text-body-sm text-brand-secondary">{info.creativeMode} mode</p>
                                          <p className="text-body-sm text-bone-faint">Shadow: {info.shadow?.split('.')[0]}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Source + Refine */}
              <div className="flex items-center justify-between pt-2 border-t border-brand-border">
                <span className="uppercase-label text-brand-secondary">
                  {subtasteSource === 'quiz' ? 'Calibrated' :
                   subtasteSource === 'cache' ? 'Cached' : 'Provisional'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const quizUrl = process.env.REACT_APP_SUBTASTE_URL || 'http://localhost:3001';
                    const callback = encodeURIComponent(window.location.origin + '/');
                    const uidParam = subtasteUserIdRef ? `&userId=${subtasteUserIdRef}` : '';
                    // If user has any genome data, they're a returning user → profile for refinement
                    // If no data at all, send to fresh quiz
                    const isReturningUser = !!subtasteData;
                    if (isReturningUser) {
                      window.location.href = `${quizUrl}/profile?callback=${callback}${uidParam}`;
                    } else {
                      window.location.href = `${quizUrl}/quiz?callback=${callback}${uidParam}`;
                    }
                  }}
                  className="text-body-sm text-brand-text underline"
                >
                  {subtasteData ? 'Refine' : 'Begin calibration'}
                </button>
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
          onRescan={hasVisualDNA ? handleRescanTizita : undefined}
          rescanning={rescanningTizita}
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
                  userId="default_user"
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

        {/* Card 5 — Writing DNA (from Ibis) */}
        <HubCard
          label="Writing DNA"
          stat={writingDnaData ? (writingDnaData.patterns?.tone?.[0] || 'Analyzed') : null}
          statLabel={
            writingDnaData
              ? `${writingDnaData.wordCount?.toLocaleString() || 0} words`
              : null
          }
          connected={!!writingDnaData}
          onConnect={fetchWritingDna}
          connectLabel={connectingWritingDna ? 'Connecting...' : 'Connect Ibis'}
          onRescan={writingDnaData ? handleRescanWritingDna : undefined}
          rescanning={rescanningWritingDna}
          expanded={expandedCard === 'writing'}
          onToggle={() => toggleCard('writing')}
          accentElement={writingDnaData?.patterns?.metaphorDensity ? (
            <span className="text-body-sm text-brand-secondary italic">
              {writingDnaData.patterns.metaphorDensity} metaphor
            </span>
          ) : null}
        >
          {writingDnaData && (
            <div className="space-y-6">
              {/* Voice signature */}
              {writingDnaData.signature && (
                <div className="border border-brand-border p-4">
                  <p className="uppercase-label text-brand-secondary mb-2">Voice Signature</p>
                  <p className="font-display text-body leading-relaxed text-brand-text">
                    {writingDnaData.signature}
                  </p>
                </div>
              )}

              {/* Quantitative metrics */}
              {writingDnaData.metrics && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-3">Metrics</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-display-md text-brand-text">{writingDnaData.metrics.avgSentenceLength?.toFixed(1)}</p>
                      <p className="text-label text-brand-secondary">avg sentence length</p>
                    </div>
                    <div>
                      <p className="text-display-md text-brand-text">{((writingDnaData.metrics.typeTokenRatio || 0) * 100).toFixed(0)}%</p>
                      <p className="text-label text-brand-secondary">vocabulary diversity</p>
                    </div>
                    <div>
                      <p className="text-display-md text-brand-text">{((writingDnaData.metrics.dialogueRatio || 0) * 100).toFixed(0)}%</p>
                      <p className="text-label text-brand-secondary">dialogue ratio</p>
                    </div>
                    <div>
                      <p className="text-display-md text-brand-text">{writingDnaData.metrics.avgParagraphLength?.toFixed(0)}</p>
                      <p className="text-label text-brand-secondary">avg paragraph length</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Qualitative patterns */}
              {writingDnaData.patterns && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-3">Patterns</p>
                  <div className="space-y-3">
                    {writingDnaData.patterns.tone?.length > 0 && (
                      <div>
                        <p className="text-body-sm text-brand-secondary">Tone</p>
                        <p className="text-body text-brand-text">{writingDnaData.patterns.tone.join(', ')}</p>
                      </div>
                    )}
                    {writingDnaData.patterns.cadence && (
                      <div>
                        <p className="text-body-sm text-brand-secondary">Cadence</p>
                        <p className="text-body text-brand-text">{writingDnaData.patterns.cadence}</p>
                      </div>
                    )}
                    {writingDnaData.patterns.syntaxSignature && (
                      <div>
                        <p className="text-body-sm text-brand-secondary">Syntax</p>
                        <p className="text-body text-brand-text">{writingDnaData.patterns.syntaxSignature}</p>
                      </div>
                    )}
                    {writingDnaData.patterns.narrativeVoice && (
                      <div>
                        <p className="text-body-sm text-brand-secondary">Narrative voice</p>
                        <p className="text-body text-brand-text">{writingDnaData.patterns.narrativeVoice}</p>
                      </div>
                    )}
                    {writingDnaData.patterns.recurringMotifs?.length > 0 && (
                      <div>
                        <p className="text-body-sm text-brand-secondary">Motifs</p>
                        <p className="text-body text-brand-text">{writingDnaData.patterns.recurringMotifs.join(', ')}</p>
                      </div>
                    )}
                    {writingDnaData.patterns.influences?.length > 0 && (
                      <div>
                        <p className="text-body-sm text-brand-secondary">Influences</p>
                        <p className="text-body text-brand-text">{writingDnaData.patterns.influences.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Source info */}
              <div className="border-t border-brand-border pt-3">
                <p className="text-label text-brand-secondary">
                  {writingDnaData.analyzedDocumentCount} documents analyzed
                  {writingDnaData.fetchedAt && ` · synced ${new Date(writingDnaData.fetchedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          )}
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
