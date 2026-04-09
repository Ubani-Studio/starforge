/**
 * Subtaste Classification Service
 *
 * Self-contained classification engine ported from @subtaste/core.
 * Maps psychometric profiles to THE TWELVE archetypes using Big Five
 * Openness sub-facets and MUSIC model dimensions.
 *
 * Data source: subtaste-twelve/packages/core (static definitions + algorithm).
 * Kept self-contained to avoid TypeScript build pipeline in Starforge's CJS backend.
 */

// ============================================================================
// THE TWELVE — Archetype Definitions
// ============================================================================

const ALL_DESIGNATIONS = ['S-0', 'T-1', 'V-2', 'L-3', 'C-4', 'N-5', 'H-6', 'P-7', 'D-8', 'F-9', 'R-10', 'Ø'];

const PANTHEON = {
  'S-0': {
    designation: 'S-0', glyph: 'KETH', sigil: 'Aethonis',
    essence: 'The unmarked throne. First without announcement.',
    creativeMode: 'Visionary',
    shadow: 'Paralysis by standard. Nothing meets the mark.',
    recogniseBy: 'Others unconsciously defer to their judgment. They rarely explain themselves. When they speak, rooms reorganise.',
  },
  'T-1': {
    designation: 'T-1', glyph: 'STRATA', sigil: 'Tectris',
    essence: 'The hidden architecture. Layers beneath surfaces.',
    creativeMode: 'Architectural',
    shadow: 'Over-engineering. The system becomes the end.',
    recogniseBy: 'They explain systems you did not know existed. They build frameworks before building anything else.',
  },
  'V-2': {
    designation: 'V-2', glyph: 'OMEN', sigil: 'Vatis',
    essence: 'What arrives before itself. The shape of the unformed.',
    creativeMode: 'Prophetic',
    shadow: 'Cassandra syndrome. Right too soon.',
    recogniseBy: 'Their recommendations age well. Years later, you remember what they said.',
  },
  'L-3': {
    designation: 'L-3', glyph: 'SILT', sigil: 'Seris',
    essence: 'Patient sediment. What accumulates in darkness.',
    creativeMode: 'Developmental',
    shadow: 'Endless patience becomes enabling.',
    recogniseBy: 'Long memory. They remember what you showed them three years ago. They are still watching.',
  },
  'C-4': {
    designation: 'C-4', glyph: 'CULL', sigil: 'Severis',
    essence: 'The necessary cut. What must be removed, removed.',
    creativeMode: 'Editorial',
    shadow: 'Nihilistic rejection. Nothing survives.',
    recogniseBy: 'Sparse playlists. Brutal honesty. They will tell you what is wrong before what is right.',
  },
  'N-5': {
    designation: 'N-5', glyph: 'LIMN', sigil: 'Nexilis',
    essence: 'To illuminate by edge. The binding outline.',
    creativeMode: 'Integrative',
    shadow: 'Pathological balance. Refuses to choose.',
    recogniseBy: 'Unexpected pairings that work. Playlists that should not cohere but do.',
  },
  'H-6': {
    designation: 'H-6', glyph: 'TOLL', sigil: 'Voxis',
    essence: 'The bell that cannot be unheard. The summons.',
    creativeMode: 'Advocacy',
    shadow: 'Missionary zeal. Sharing becomes shoving.',
    recogniseBy: 'Relentless enthusiasm. They have sent you the same link three times. They are right, and they know it.',
  },
  'P-7': {
    designation: 'P-7', glyph: 'VAULT', sigil: 'Palimpsest',
    essence: 'What is kept. Writing over writing.',
    creativeMode: 'Archival',
    shadow: 'Hoarding. Knowledge that never circulates.',
    recogniseBy: 'They cite sources you have never heard of. They own formats you cannot play.',
  },
  'D-8': {
    designation: 'D-8', glyph: 'WICK', sigil: 'Siphis',
    essence: 'Draws flame upward without burning. The hollow channel.',
    creativeMode: 'Channelling',
    shadow: 'Dissolution. The channel consumes the self.',
    recogniseBy: 'Uncanny recommendations. They cannot always explain why. They just knew.',
  },
  'F-9': {
    designation: 'F-9', glyph: 'ANVIL', sigil: 'Crucis',
    essence: 'Where pressure becomes form. The manifestation point.',
    creativeMode: 'Manifestation',
    shadow: 'Crude materialism. Only what ships matters.',
    recogniseBy: 'They have built something. While others talked, they shipped.',
  },
  'R-10': {
    designation: 'R-10', glyph: 'SCHISM', sigil: 'Apostis',
    essence: 'The productive fracture. What breaks to reveal grain.',
    creativeMode: 'Contrarian',
    shadow: 'Reflexive opposition. Disagreement as identity.',
    recogniseBy: 'Their takes age strangely. What seemed wrong becomes obvious. Or does not.',
  },
  'Ø': {
    designation: 'Ø', glyph: 'VOID', sigil: 'Lacuna',
    essence: 'The deliberate absence. What receives by containing nothing.',
    creativeMode: 'Receptive',
    shadow: 'Passivity. Reception without response.',
    recogniseBy: 'They listen longer than anyone. Their recommendations feel like mirrors.',
  },
};

// ============================================================================
// INTERNAL MAPPINGS — Psychometric weight profiles per archetype
// ============================================================================

const INTERNAL_MAPPINGS = {
  'S-0': {
    psychometricWeights: {
      openness: { aesthetics: 0.9, fantasy: 0.6, feelings: 0.5, actions: 0.4, ideas: 0.8, values: 0.7 },
      intellect: 0.7,
      music: { mellow: 0.3, unpretentious: 0.1, sophisticated: 0.9, intense: 0.4, contemporary: 0.5 },
    },
  },
  'T-1': {
    psychometricWeights: {
      openness: { aesthetics: 0.6, fantasy: 0.5, feelings: 0.3, actions: 0.6, ideas: 0.95, values: 0.5 },
      intellect: 0.95,
      music: { mellow: 0.2, unpretentious: 0.3, sophisticated: 0.8, intense: 0.5, contemporary: 0.6 },
    },
  },
  'V-2': {
    psychometricWeights: {
      openness: { aesthetics: 0.8, fantasy: 0.9, feelings: 0.7, actions: 0.8, ideas: 0.7, values: 0.6 },
      intellect: 0.6,
      music: { mellow: 0.4, unpretentious: 0.2, sophisticated: 0.85, intense: 0.5, contemporary: 0.8 },
    },
  },
  'L-3': {
    psychometricWeights: {
      openness: { aesthetics: 0.6, fantasy: 0.5, feelings: 0.8, actions: 0.4, ideas: 0.5, values: 0.7 },
      intellect: 0.5,
      music: { mellow: 0.8, unpretentious: 0.6, sophisticated: 0.5, intense: 0.2, contemporary: 0.4 },
    },
  },
  'C-4': {
    psychometricWeights: {
      openness: { aesthetics: 0.7, fantasy: 0.3, feelings: 0.4, actions: 0.5, ideas: 0.8, values: 0.6 },
      intellect: 0.8,
      music: { mellow: 0.1, unpretentious: 0.2, sophisticated: 0.7, intense: 0.8, contemporary: 0.5 },
    },
  },
  'N-5': {
    psychometricWeights: {
      openness: { aesthetics: 0.8, fantasy: 0.6, feelings: 0.7, actions: 0.6, ideas: 0.6, values: 0.8 },
      intellect: 0.6,
      music: { mellow: 0.5, unpretentious: 0.5, sophisticated: 0.7, intense: 0.5, contemporary: 0.5 },
    },
  },
  'H-6': {
    psychometricWeights: {
      openness: { aesthetics: 0.7, fantasy: 0.6, feelings: 0.9, actions: 0.8, ideas: 0.4, values: 0.5 },
      intellect: 0.4,
      music: { mellow: 0.2, unpretentious: 0.4, sophisticated: 0.5, intense: 0.9, contemporary: 0.7 },
    },
  },
  'P-7': {
    psychometricWeights: {
      openness: { aesthetics: 0.8, fantasy: 0.4, feelings: 0.5, actions: 0.3, ideas: 0.9, values: 0.6 },
      intellect: 0.9,
      music: { mellow: 0.6, unpretentious: 0.3, sophisticated: 0.9, intense: 0.3, contemporary: 0.3 },
    },
  },
  'D-8': {
    psychometricWeights: {
      openness: { aesthetics: 0.7, fantasy: 0.9, feelings: 0.8, actions: 0.7, ideas: 0.5, values: 0.5 },
      intellect: 0.4,
      music: { mellow: 0.5, unpretentious: 0.5, sophisticated: 0.6, intense: 0.6, contemporary: 0.7 },
    },
  },
  'F-9': {
    psychometricWeights: {
      openness: { aesthetics: 0.4, fantasy: 0.3, feelings: 0.4, actions: 0.9, ideas: 0.6, values: 0.5 },
      intellect: 0.7,
      music: { mellow: 0.3, unpretentious: 0.7, sophisticated: 0.4, intense: 0.6, contemporary: 0.6 },
    },
  },
  'R-10': {
    psychometricWeights: {
      openness: { aesthetics: 0.6, fantasy: 0.7, feelings: 0.6, actions: 0.9, ideas: 0.7, values: 0.8 },
      intellect: 0.7,
      music: { mellow: 0.1, unpretentious: 0.3, sophisticated: 0.6, intense: 0.9, contemporary: 0.8 },
    },
  },
  'Ø': {
    psychometricWeights: {
      openness: { aesthetics: 0.8, fantasy: 0.7, feelings: 0.9, actions: 0.4, ideas: 0.6, values: 0.7 },
      intellect: 0.5,
      music: { mellow: 0.7, unpretentious: 0.6, sophisticated: 0.6, intense: 0.3, contemporary: 0.4 },
    },
  },
};

// ============================================================================
// SCORING CONFIG
// ============================================================================

const DEFAULT_SCORING_CONFIG = {
  psychometricWeight: 0.6,
  temperature: 12.0,
  distributionThreshold: 0.02,
  secondaryThreshold: 0.1,
};

// ============================================================================
// CLASSIFICATION ENGINE
// ============================================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDefaultPsychometrics() {
  return {
    openness: { fantasy: 0.5, aesthetics: 0.5, feelings: 0.5, actions: 0.5, ideas: 0.5, values: 0.5 },
    intellect: 0.5,
    musicPreferences: { mellow: 0.5, unpretentious: 0.5, sophisticated: 0.5, intense: 0.5, contemporary: 0.5 },
  };
}

/**
 * Calculate how similar a psychometric profile is to an archetype's target
 */
function calculateSimilarity(profile, designation) {
  const target = INTERNAL_MAPPINGS[designation].psychometricWeights;

  // Weighted dimensions: identity-signal dimensions get higher weight
  const dims = [
    // Openness facets (6 dimensions)
    { d: profile.openness.fantasy - target.openness.fantasy, w: 1.0 },
    { d: profile.openness.aesthetics - target.openness.aesthetics, w: 1.5 },
    { d: profile.openness.feelings - target.openness.feelings, w: 1.0 },
    { d: profile.openness.actions - target.openness.actions, w: 1.5 },
    { d: profile.openness.ideas - target.openness.ideas, w: 1.5 },
    { d: profile.openness.values - target.openness.values, w: 1.0 },
    // Intellect
    { d: profile.intellect - target.intellect, w: 1.5 },
    // Music preferences (5 dimensions)
    { d: profile.musicPreferences.mellow - target.music.mellow, w: 1.0 },
    { d: profile.musicPreferences.unpretentious - target.music.unpretentious, w: 1.0 },
    { d: profile.musicPreferences.sophisticated - target.music.sophisticated, w: 1.2 },
    { d: profile.musicPreferences.intense - target.music.intense, w: 1.2 },
    { d: profile.musicPreferences.contemporary - target.music.contemporary, w: 1.0 },
  ];

  // Weighted RMS distance — squared distances punish large mismatches more,
  // creating clearer separation between matching and non-matching archetypes
  let weightedSumSq = 0;
  let totalWeight = 0;
  for (const { d, w } of dims) {
    weightedSumSq += (d * d) * w;
    totalWeight += w;
  }
  const rmsDistance = Math.sqrt(weightedSumSq / totalWeight);
  return 1 - rmsDistance;
}

/**
 * Softmax to convert scores to probability distribution
 */
function softmax(scores, temperature) {
  const result = {};
  const exps = ALL_DESIGNATIONS.map(d => Math.exp(scores[d] * temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  ALL_DESIGNATIONS.forEach((d, i) => { result[d] = exps[i] / sum; });
  return result;
}

/**
 * Filter distribution to significant weights
 */
function filterDistribution(distribution, threshold) {
  const filtered = {};
  for (const [d, weight] of Object.entries(distribution)) {
    if (weight >= threshold) filtered[d] = weight;
  }
  const sum = Object.values(filtered).reduce((a, b) => a + b, 0);
  for (const d of Object.keys(filtered)) {
    filtered[d] = filtered[d] / sum;
  }
  return filtered;
}

/**
 * Shannon entropy of a distribution
 */
function calculateEntropy(distribution) {
  let entropy = 0;
  for (const p of Object.values(distribution)) {
    if (p > 0) entropy -= p * Math.log(p);
  }
  return entropy;
}

/**
 * Main classification function
 *
 * @param {object} psychometrics - Big Five + MUSIC profile
 * @param {object} [config] - Scoring configuration overrides
 * @returns {object} Classification result with primary, secondary, distribution
 */
function classify(psychometrics, config = {}) {
  const cfg = { ...DEFAULT_SCORING_CONFIG, ...config };

  // Calculate similarity to each archetype
  const rawScores = {};
  for (const d of ALL_DESIGNATIONS) {
    rawScores[d] = calculateSimilarity(psychometrics, d);
  }

  // Apply softmax to get probability distribution
  const distribution = softmax(rawScores, cfg.temperature);

  // Filter to significant weights
  const filtered = filterDistribution(distribution, cfg.distributionThreshold);

  // Find primary and secondary
  const sorted = Object.entries(filtered).sort(([, a], [, b]) => b - a);

  const primary = sorted[0][0];
  const primaryConfidence = sorted[0][1];

  let secondary = null;
  let secondaryConfidence = 0;
  if (sorted.length > 1 && sorted[1][1] >= cfg.secondaryThreshold) {
    secondary = sorted[1][0];
    secondaryConfidence = sorted[1][1];
  }

  let tertiary = null;
  let tertiaryConfidence = 0;
  if (sorted.length > 2 && sorted[2][1] >= cfg.distributionThreshold) {
    tertiary = sorted[2][0];
    tertiaryConfidence = sorted[2][1];
  }

  // Entropy-based overall confidence
  const entropy = calculateEntropy(distribution);
  const maxEntropy = Math.log(12);
  const overallConfidence = 1 - (entropy / maxEntropy);

  return {
    classification: {
      primary: {
        designation: primary,
        ...PANTHEON[primary],
        confidence: primaryConfidence * overallConfidence,
      },
      secondary: secondary ? {
        designation: secondary,
        ...PANTHEON[secondary],
        confidence: secondaryConfidence * overallConfidence,
      } : null,
      tertiary: tertiary ? {
        designation: tertiary,
        ...PANTHEON[tertiary],
        confidence: tertiaryConfidence * overallConfidence,
      } : null,
      distribution: filtered,
    },
    psychometrics,
    rawScores,
  };
}

// ============================================================================
// STARFORGE INTEGRATION — Map Starforge data to psychometric profile
// ============================================================================

/**
 * Build psychometric profile from Starforge's existing data.
 * Maps Audio DNA, Visual DNA, Writing Samples, and Project DNA
 * to the Big Five Openness facets + MUSIC model dimensions.
 *
 * @param {object} params
 * @param {object} [params.audioDNA] - From catalogAnalysisService
 * @param {object} [params.visualDNA] - From tizitaService/visualDnaCache
 * @param {object} [params.writingSamples] - From aiTwinService
 * @param {object} [params.projectDNA] - From projectDnaService
 * @returns {object} Psychometric profile ready for classify()
 */
function buildPsychometrics({ audioDNA, visualDNA, writingSamples, projectDNA, writingDNA } = {}) {
  const profile = getDefaultPsychometrics();

  // Audio DNA → MUSIC model dimensions
  if (audioDNA) {
    const tc = audioDNA.taste_coherence || audioDNA.tasteCoherence || {};
    const sp = audioDNA.sonic_palette || audioDNA.sonicPalette || {};
    const ig = audioDNA.influence_genealogy || audioDNA.influenceGenealogy || {};

    // Genre coherence → sophisticated (low entropy = high sophistication)
    if (tc.genre_coherence != null) {
      profile.musicPreferences.sophisticated = clamp(tc.genre_coherence, 0, 1);
    }

    // Energy variance → intense
    if (tc.energy_variance != null) {
      profile.musicPreferences.intense = clamp(tc.energy_variance, 0, 1);
    }

    // BPM consistency → contemporary (high consistency = less contemporary, more traditional)
    if (tc.bpm_consistency != null) {
      profile.musicPreferences.contemporary = clamp(1 - tc.bpm_consistency * 0.5, 0, 1);
    }

    // Bass prominence → mellow (inverse)
    if (sp.bass != null) {
      profile.musicPreferences.mellow = clamp(1 - sp.bass, 0, 1);
    }

    // Primary genre informs unpretentious
    if (ig.primary_genre) {
      const unpretentiousGenres = ['country', 'folk', 'blues', 'gospel', 'singer-songwriter'];
      profile.musicPreferences.unpretentious = unpretentiousGenres.some(g =>
        ig.primary_genre.toLowerCase().includes(g)
      ) ? 0.7 : 0.3;
    }
  }

  // Visual DNA → Openness facets
  if (visualDNA) {
    if (visualDNA.warmth != null) {
      profile.openness.feelings = clamp(visualDNA.warmth, 0, 1);
    }
    if (visualDNA.energy != null) {
      profile.openness.actions = clamp(visualDNA.energy, 0, 1);
    }
    // Visual themes → aesthetics
    if (visualDNA.themes && visualDNA.themes.length > 0) {
      const abstractThemes = ['minimal', 'abstract', 'geometric', 'surreal'];
      const hasAbstract = visualDNA.themes.some(t => abstractThemes.includes(t.toLowerCase()));
      profile.openness.aesthetics = hasAbstract ? 0.8 : 0.5;
    }
  }

  // Writing samples → intellect + openness.ideas
  if (writingSamples) {
    // Subconscious writing reveals deeper intellectual profile
    if (writingSamples.subconscious) {
      const wordCount = writingSamples.subconscious.split(/\s+/).length;
      // Longer, more reflective writing → higher intellect
      profile.intellect = clamp(Math.min(wordCount / 500, 1) * 0.8 + 0.2, 0, 1);
      profile.openness.ideas = clamp(profile.intellect * 0.9, 0, 1);
    }
  }

  // WritingDNA (from Ibis) → rich psychometric signal from actual writing behavior
  if (writingDNA && writingDNA.metrics) {
    const m = writingDNA.metrics;

    // Sentence length → intellect (elaborate writing = high intellect)
    if (m.avgSentenceLength != null) {
      profile.intellect = clamp(Math.max(profile.intellect, m.avgSentenceLength / 25), 0, 1);
    }

    // Type-token ratio → openness.ideas (vocabulary diversity)
    if (m.typeTokenRatio != null) {
      profile.openness.ideas = clamp(Math.max(profile.openness.ideas, m.typeTokenRatio * 1.5), 0, 1);
    }

    // Dialogue ratio → openness.feelings (conversational style)
    if (m.dialogueRatio != null) {
      profile.openness.feelings = clamp(Math.max(profile.openness.feelings, m.dialogueRatio * 2), 0, 1);
    }

    // Sentence length variance → openness.actions (stylistic range)
    if (m.sentenceLengthVariance != null) {
      profile.openness.actions = clamp(Math.max(profile.openness.actions, Math.min(m.sentenceLengthVariance / 200, 1)), 0, 1);
    }

    // Question frequency → openness.fantasy (exploratory thinking)
    if (m.questionFrequency != null) {
      profile.openness.fantasy = clamp(Math.max(profile.openness.fantasy, m.questionFrequency * 3), 0, 1);
    }
  }

  // WritingDNA patterns → refine openness.aesthetics
  if (writingDNA && writingDNA.patterns) {
    const p = writingDNA.patterns;

    // Rich metaphor density → high aesthetics
    const metaphorMap = { sparse: 0.3, moderate: 0.5, rich: 0.75, saturated: 0.9 };
    if (p.metaphorDensity && metaphorMap[p.metaphorDensity] != null) {
      profile.openness.aesthetics = clamp(
        Math.max(profile.openness.aesthetics, metaphorMap[p.metaphorDensity]), 0, 1
      );
    }

    // Many influences → openness.values (broad cultural engagement)
    if (p.influences && p.influences.length > 0) {
      profile.openness.values = clamp(
        Math.max(profile.openness.values, 0.4 + (p.influences.length / 8) * 0.5), 0, 1
      );
    }
  }

  // Project DNA → strongest signal for openness facets
  if (projectDNA && projectDNA.coreIdentity) {
    const ci = projectDNA.coreIdentity;

    // Many domains → high openness across the board
    const domainCount = (ci.domains || []).length;
    const domainFactor = clamp(domainCount / 7, 0, 1);
    profile.openness.ideas = clamp(0.5 + domainFactor * 0.4, 0, 1);
    profile.openness.values = clamp(0.5 + domainFactor * 0.3, 0, 1);

    // Many tools → high actions (doing, not just thinking)
    const toolCount = (ci.tools || []).length;
    profile.openness.actions = clamp(0.4 + (toolCount / 10) * 0.5, 0, 1);

    // References → high aesthetics + fantasy (deeply engaged with art/culture)
    const refCount = (ci.references || []).length;
    profile.openness.aesthetics = clamp(0.5 + (refCount / 8) * 0.4, 0, 1);
    profile.openness.fantasy = clamp(0.4 + (refCount / 8) * 0.3, 0, 1);

    // Strong anti-taste → high intellect (discriminating judgment)
    const antiCount = (ci.antiTaste || []).length;
    profile.intellect = clamp(Math.max(profile.intellect, 0.5 + antiCount * 0.08), 0, 1);
  }

  return profile;
}

/**
 * Classify a user from Starforge data
 */
function classifyUser({ audioDNA, visualDNA, writingSamples, projectDNA, writingDNA, convictionWeights } = {}) {
  let psychometrics = buildPsychometrics({ audioDNA, visualDNA, writingSamples, projectDNA, writingDNA });

  // Apply conviction weighting if provided — dimensions backed by
  // high-conviction signals get amplified, thin signals dampen toward baseline
  if (convictionWeights?.signalConfidence) {
    const convictionWeightService = require('./convictionWeightService');
    psychometrics = convictionWeightService.applyConvictionWeights(
      psychometrics, convictionWeights.signalConfidence
    );
  }

  return classify(psychometrics);
}

/**
 * Get archetype info by designation
 */
function getArchetype(designation) {
  return PANTHEON[designation] || null;
}

module.exports = {
  PANTHEON,
  ALL_DESIGNATIONS,
  classify,
  classifyUser,
  buildPsychometrics,
  getDefaultPsychometrics,
  getArchetype,
};
