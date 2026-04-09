/**
 * Relational Intelligence Service
 *
 * Duo/team profiling using archetype relational dynamics.
 * Turns Ori from a personal tool into a B2B platform.
 *
 * Each archetype has:
 * - collaboratesWith: who they work best with (+20 affinity)
 * - tensionWith: creative friction that sharpens both (+10)
 * - avoidWith: friction risk (-15)
 * - growthToward: growth catalyst (+15)
 */

const subtasteService = require('./subtasteService');

// Relational weight constants
const COLLABORATE_SCORE = 20;
const TENSION_SCORE = 10; // Positive — creative tension is valuable
const AVOID_SCORE = -15;
const GROWTH_SCORE = 15;

class RelationalIntelligenceService {

  /**
   * Analyze a duo (two creators) for creative chemistry.
   * @param {object} profile1 - { archetypePrimary, archetypeSecondary, distribution, audio, visual }
   * @param {object} profile2 - Same shape
   * @returns Complementarity analysis
   */
  analyzeDuo(profile1, profile2) {
    if (!profile1?.archetypePrimary || !profile2?.archetypePrimary) {
      return { success: false, error: 'Both profiles need archetype classification' };
    }

    const arch1 = subtasteService.getArchetype(profile1.archetypePrimary);
    const arch2 = subtasteService.getArchetype(profile2.archetypePrimary);

    if (!arch1 || !arch2) {
      return { success: false, error: 'Unknown archetype designation' };
    }

    // Calculate relational score from archetype dynamics
    const relationalScore = this._calculateRelationalScore(
      profile1.archetypePrimary, profile2.archetypePrimary, arch1, arch2
    );

    // Distribution overlap — how similar their archetype distributions are
    const distributionOverlap = this._calculateDistributionOverlap(
      profile1.distribution || {}, profile2.distribution || {}
    );

    // Combined complementarity (relational dynamics weighted more than raw overlap)
    const complementarity = Math.max(0, Math.min(100,
      relationalScore.score * 0.6 + distributionOverlap.similarity * 40 + 20
    ));

    // Predict collaboration type
    const collaborationType = this._predictCollaborationType(
      arch1, arch2, relationalScore
    );

    return {
      success: true,
      complementarity: Math.round(complementarity),
      relational: relationalScore,
      distributionOverlap,
      collaborationType,
      profile1Summary: {
        designation: profile1.archetypePrimary,
        glyph: arch1.glyph,
        creativeMode: arch1.creativeMode,
      },
      profile2Summary: {
        designation: profile2.archetypePrimary,
        glyph: arch2.glyph,
        creativeMode: arch2.creativeMode,
      },
    };
  }

  /**
   * Analyze a team of creators.
   * @param {object[]} profiles - Array of profile objects
   */
  analyzeTeam(profiles) {
    if (!profiles || profiles.length < 2) {
      return { success: false, error: 'Need at least 2 profiles' };
    }

    // Pairwise analysis
    const pairwise = [];
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        pairwise.push({
          pair: [i, j],
          analysis: this.analyzeDuo(profiles[i], profiles[j]),
        });
      }
    }

    // Average complementarity
    const validPairs = pairwise.filter(p => p.analysis.success);
    const avgComplementarity = validPairs.length > 0
      ? Math.round(validPairs.reduce((s, p) => s + p.analysis.complementarity, 0) / validPairs.length)
      : 0;

    // Archetype coverage
    const designations = profiles.map(p => p.archetypePrimary).filter(Boolean);
    const uniqueArchetypes = [...new Set(designations)];

    // Identify roster gaps
    const allDesignations = subtasteService.ALL_DESIGNATIONS;
    const missingArchetypes = allDesignations
      .filter(d => !designations.includes(d))
      .map(d => {
        const arch = subtasteService.getArchetype(d);
        return arch ? { designation: d, glyph: arch.glyph, creativeMode: arch.creativeMode } : null;
      })
      .filter(Boolean);

    // Find strongest and weakest pairs
    const strongest = validPairs.length > 0
      ? validPairs.reduce((a, b) => a.analysis.complementarity > b.analysis.complementarity ? a : b)
      : null;
    const weakest = validPairs.length > 0
      ? validPairs.reduce((a, b) => a.analysis.complementarity < b.analysis.complementarity ? a : b)
      : null;

    return {
      success: true,
      teamSize: profiles.length,
      avgComplementarity,
      archetypeCoverage: {
        unique: uniqueArchetypes.length,
        total: allDesignations.length,
        coveragePercent: Math.round((uniqueArchetypes.length / allDesignations.length) * 100),
      },
      missingArchetypes: missingArchetypes.slice(0, 5),
      strongestPair: strongest ? {
        pair: strongest.pair,
        complementarity: strongest.analysis.complementarity,
      } : null,
      weakestPair: weakest ? {
        pair: weakest.pair,
        complementarity: weakest.analysis.complementarity,
      } : null,
      pairwise: validPairs.map(p => ({
        pair: p.pair,
        complementarity: p.analysis.complementarity,
        collaborationType: p.analysis.collaborationType,
      })),
    };
  }

  // ── Private Methods ──

  _calculateRelationalScore(d1, d2, arch1, arch2) {
    let score = 0;
    const dynamics = [];

    // Check 1→2 relationships
    if (arch1.collaboratesWith?.includes(d2)) {
      score += COLLABORATE_SCORE;
      dynamics.push({ type: 'collaborate', from: d1, to: d2, score: COLLABORATE_SCORE });
    }
    if (arch1.tensionWith?.includes(d2)) {
      score += TENSION_SCORE;
      dynamics.push({ type: 'tension', from: d1, to: d2, score: TENSION_SCORE });
    }
    if (arch1.avoidWith?.includes(d2)) {
      score += AVOID_SCORE;
      dynamics.push({ type: 'avoid', from: d1, to: d2, score: AVOID_SCORE });
    }
    if (arch1.growthToward === d2) {
      score += GROWTH_SCORE;
      dynamics.push({ type: 'growth', from: d1, to: d2, score: GROWTH_SCORE });
    }

    // Check 2→1 relationships
    if (arch2.collaboratesWith?.includes(d1)) {
      score += COLLABORATE_SCORE;
      dynamics.push({ type: 'collaborate', from: d2, to: d1, score: COLLABORATE_SCORE });
    }
    if (arch2.tensionWith?.includes(d1)) {
      score += TENSION_SCORE;
      dynamics.push({ type: 'tension', from: d2, to: d1, score: TENSION_SCORE });
    }
    if (arch2.avoidWith?.includes(d1)) {
      score += AVOID_SCORE;
      dynamics.push({ type: 'avoid', from: d2, to: d1, score: AVOID_SCORE });
    }
    if (arch2.growthToward === d1) {
      score += GROWTH_SCORE;
      dynamics.push({ type: 'growth', from: d2, to: d1, score: GROWTH_SCORE });
    }

    return { score, dynamics };
  }

  _calculateDistributionOverlap(dist1, dist2) {
    const allKeys = new Set([...Object.keys(dist1), ...Object.keys(dist2)]);
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (const key of allKeys) {
      const v1 = dist1[key] || 0;
      const v2 = dist2[key] || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    const similarity = magnitude > 0 ? dotProduct / magnitude : 0;

    return {
      similarity: Math.round(similarity * 100) / 100,
      interpretation: similarity > 0.8 ? 'Very similar taste profiles'
        : similarity > 0.6 ? 'Overlapping with distinct differences'
        : similarity > 0.4 ? 'Moderate overlap'
        : 'Distinct taste profiles',
    };
  }

  _predictCollaborationType(arch1, arch2, relational) {
    const hasCollaborate = relational.dynamics.some(d => d.type === 'collaborate');
    const hasTension = relational.dynamics.some(d => d.type === 'tension');
    const hasGrowth = relational.dynamics.some(d => d.type === 'growth');
    const hasAvoid = relational.dynamics.some(d => d.type === 'avoid');

    if (hasCollaborate && !hasAvoid) {
      return {
        type: 'natural_allies',
        description: `${arch1.glyph} and ${arch2.glyph} are natural collaborators. Their creative modes complement each other.`,
      };
    }
    if (hasTension && hasGrowth) {
      return {
        type: 'growth_catalyst',
        description: `${arch1.glyph} and ${arch2.glyph} push each other to grow. The tension between them produces something neither could make alone.`,
      };
    }
    if (hasTension && !hasAvoid) {
      return {
        type: 'creative_friction',
        description: `${arch1.glyph} and ${arch2.glyph} create productive friction. Their disagreements sharpen the work.`,
      };
    }
    if (hasAvoid && !hasCollaborate) {
      return {
        type: 'challenging',
        description: `${arch1.glyph} and ${arch2.glyph} may clash on fundamentals. Success requires explicit negotiation of creative direction.`,
      };
    }

    return {
      type: 'neutral',
      description: `${arch1.glyph} and ${arch2.glyph} have a neutral dynamic. Their collaboration depends on the project context.`,
    };
  }
}

module.exports = new RelationalIntelligenceService();
