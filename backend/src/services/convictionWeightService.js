/**
 * Conviction Weight Service
 *
 * Weights identity signals by behavioral conviction — what you actually
 * spend time/money on matters more than what you passively consume.
 *
 * Hierarchy: money spent > time creating > repeat listens > saves > streams > views
 *
 * Sources:
 * - Photo ratings (Tizita): best > favorite > rated
 * - Audio library: track play count, library tenure
 * - Crucibla API (future): conviction scores per track
 * - Palmlion API (future): tip amounts
 */

class ConvictionWeightService {

  /**
   * Calculate conviction weights from available signals.
   *
   * @param {object} params
   * @param {object} params.audioDNA - Audio DNA from Starforge
   * @param {object} params.visualDNA - Visual DNA from Tizita
   * @param {object} params.photoSignals - Photo rating breakdown { best, favorite, rated }
   * @param {object} params.projectDNA - Project DNA
   * @param {object} params.writingDNA - Writing DNA from Ibis
   * @param {object} params.cruciblaData - Future: conviction data from Crucibla API
   * @param {object} params.palmlionData - Future: tip data from Palmlion API
   * @returns {object} Conviction weights + quality score
   */
  getConvictionWeights({
    audioDNA,
    visualDNA,
    photoSignals,
    projectDNA,
    writingDNA,
    cruciblaData,
    palmlionData,
  } = {}) {
    const weights = {
      audio: this._audioConviction(audioDNA),
      visual: this._visualConviction(visualDNA, photoSignals),
      writing: this._writingConviction(writingDNA),
      project: this._projectConviction(projectDNA),
      monetary: this._monetaryConviction(cruciblaData, palmlionData),
    };

    // Overall data quality score (0-100)
    const qualityScore = this._calculateQualityScore(weights);

    // Signal confidence — how much we should trust each identity dimension
    const signalConfidence = this._calculateSignalConfidence(weights);

    return {
      weights,
      qualityScore,
      signalConfidence,
      hasMonetarySignals: weights.monetary.present,
      summary: this._summarize(weights, qualityScore),
    };
  }

  /**
   * Apply conviction weights to psychometric profile.
   * Dimensions backed by high-conviction signals get amplified;
   * dimensions from passive/thin signals get dampened toward baseline.
   *
   * @param {object} psychometrics - Raw psychometric profile from buildPsychometrics
   * @param {object} signalConfidence - Per-dimension confidence from getConvictionWeights
   * @returns {object} Weighted psychometric profile
   */
  applyConvictionWeights(psychometrics, signalConfidence) {
    if (!psychometrics || !signalConfidence) return psychometrics;

    const weighted = JSON.parse(JSON.stringify(psychometrics)); // deep clone
    const baseline = 0.5; // neutral baseline

    // Audio-derived dimensions: musicPreferences
    if (signalConfidence.audio < 1.0) {
      const factor = signalConfidence.audio;
      for (const key of Object.keys(weighted.musicPreferences || {})) {
        weighted.musicPreferences[key] = baseline + (weighted.musicPreferences[key] - baseline) * factor;
      }
    }

    // Visual-derived dimensions: openness.aesthetics, openness.feelings
    if (signalConfidence.visual < 1.0) {
      const factor = signalConfidence.visual;
      if (weighted.openness) {
        weighted.openness.aesthetics = baseline + (weighted.openness.aesthetics - baseline) * factor;
        weighted.openness.feelings = baseline + (weighted.openness.feelings - baseline) * factor;
      }
    }

    // Writing-derived dimensions: intellect, openness.ideas
    if (signalConfidence.writing < 1.0) {
      const factor = signalConfidence.writing;
      weighted.intellect = baseline + (weighted.intellect - baseline) * factor;
      if (weighted.openness) {
        weighted.openness.ideas = baseline + (weighted.openness.ideas - baseline) * factor;
      }
    }

    // Project-derived dimensions: openness.actions, openness.values
    if (signalConfidence.project < 1.0) {
      const factor = signalConfidence.project;
      if (weighted.openness) {
        weighted.openness.actions = baseline + (weighted.openness.actions - baseline) * factor;
        weighted.openness.values = baseline + (weighted.openness.values - baseline) * factor;
      }
    }

    return weighted;
  }

  // ── Private ──

  _audioConviction(audioDNA) {
    if (!audioDNA) return { present: false, conviction: 0, detail: 'No audio data' };

    const trackCount = audioDNA.trackCount || 0;
    const coherence = audioDNA.tasteCoherence?.overall || 0;

    // More tracks = higher conviction (diminishing returns past 500)
    const volumeScore = Math.min(1.0, trackCount / 500);

    // High coherence on large library = very high conviction
    // (you're not just hoarding — you have consistent taste)
    const coherenceBonus = coherence * volumeScore;

    const conviction = Math.min(1.0, volumeScore * 0.6 + coherenceBonus * 0.4);

    return {
      present: true,
      conviction,
      trackCount,
      coherence,
      detail: trackCount > 100
        ? `Strong: ${trackCount} tracks, ${(coherence * 100).toFixed(0)}% coherent`
        : `Developing: ${trackCount} tracks`,
    };
  }

  _visualConviction(visualDNA, photoSignals) {
    if (!visualDNA && !photoSignals) {
      return { present: false, conviction: 0, detail: 'No visual data' };
    }

    let conviction = 0;
    const parts = [];

    // Tizita Visual DNA confidence
    if (visualDNA?.confidence) {
      conviction += visualDNA.confidence * 0.4;
      parts.push(`DNA confidence ${(visualDNA.confidence * 100).toFixed(0)}%`);
    }

    // Photo signal breakdown — "best" photos are highest conviction
    if (photoSignals) {
      const { best = 0, favorite = 0, rated = 0 } = photoSignals;
      // Weighted: best=3.0, favorite=2.0, rated=1.5
      const weightedPhotos = best * 3.0 + favorite * 2.0 + rated * 1.5;
      const photoScore = Math.min(1.0, weightedPhotos / 500);
      conviction += photoScore * 0.6;
      parts.push(`${best} best, ${favorite} fav, ${rated} rated`);
    }

    conviction = Math.min(1.0, conviction);

    return {
      present: true,
      conviction,
      detail: parts.join('; ') || 'Visual data present',
    };
  }

  _writingConviction(writingDNA) {
    if (!writingDNA) return { present: false, conviction: 0, detail: 'No writing data' };

    const wordCount = writingDNA.wordCount || writingDNA.metrics?.totalWords || 0;
    const docCount = writingDNA.analyzedDocCount || 0;

    // More words analyzed = higher conviction (diminishing returns past 50k)
    const volumeScore = Math.min(1.0, wordCount / 50000);

    // Multiple documents = more representative
    const diversityScore = Math.min(1.0, docCount / 20);

    const conviction = Math.min(1.0, volumeScore * 0.7 + diversityScore * 0.3);

    return {
      present: true,
      conviction,
      wordCount,
      docCount,
      detail: wordCount > 10000
        ? `Strong: ${(wordCount / 1000).toFixed(0)}k words across ${docCount} docs`
        : `Developing: ${(wordCount / 1000).toFixed(1)}k words`,
    };
  }

  _projectConviction(projectDNA) {
    if (!projectDNA) return { present: false, conviction: 0, detail: 'No project data' };

    const projectCount = projectDNA.projectCount || 0;
    const domainCount = (projectDNA.coreIdentity?.domains || []).length;

    // Multiple real projects = high conviction (these take effort)
    const projectScore = Math.min(1.0, projectCount / 10);

    // Spanning multiple domains = genuine breadth
    const domainScore = Math.min(1.0, domainCount / 5);

    const conviction = Math.min(1.0, projectScore * 0.7 + domainScore * 0.3);

    return {
      present: true,
      conviction,
      projectCount,
      domainCount,
      detail: `${projectCount} projects across ${domainCount} domains`,
    };
  }

  _monetaryConviction(cruciblaData, palmlionData) {
    // Future integration — for now, just flag presence
    if (!cruciblaData && !palmlionData) {
      return { present: false, conviction: 0, detail: 'No monetary signals yet' };
    }

    let conviction = 0;
    const parts = [];

    if (palmlionData?.totalTips) {
      // Money spent = highest conviction signal
      conviction += Math.min(0.5, palmlionData.totalTips / 100);
      parts.push(`$${palmlionData.totalTips} tipped`);
    }

    if (cruciblaData?.convictionScore) {
      conviction += Math.min(0.5, cruciblaData.convictionScore / 100);
      parts.push(`${cruciblaData.convictionScore} conviction`);
    }

    return {
      present: true,
      conviction: Math.min(1.0, conviction),
      detail: parts.join(', '),
    };
  }

  _calculateQualityScore(weights) {
    // Count present signals and their convictions
    const signals = Object.values(weights).filter(w => w.present);
    if (signals.length === 0) return 0;

    // Base: how many signal types are present (breadth)
    const breadthScore = (signals.length / 5) * 40;

    // Depth: average conviction across present signals
    const avgConviction = signals.reduce((s, w) => s + w.conviction, 0) / signals.length;
    const depthScore = avgConviction * 40;

    // Monetary bonus: money = unfakeable
    const monetaryBonus = weights.monetary.present ? 20 : 0;

    return Math.round(Math.min(100, breadthScore + depthScore + monetaryBonus));
  }

  _calculateSignalConfidence(weights) {
    // Map conviction to per-dimension confidence (0.5 = baseline, 1.0 = full trust)
    return {
      audio: weights.audio.present ? 0.5 + weights.audio.conviction * 0.5 : 0.5,
      visual: weights.visual.present ? 0.5 + weights.visual.conviction * 0.5 : 0.5,
      writing: weights.writing.present ? 0.5 + weights.writing.conviction * 0.5 : 0.5,
      project: weights.project.present ? 0.5 + weights.project.conviction * 0.5 : 0.5,
    };
  }

  _summarize(weights, qualityScore) {
    const present = Object.entries(weights)
      .filter(([, w]) => w.present)
      .map(([k]) => k);

    if (qualityScore >= 80) return 'High-conviction profile backed by deep behavioral data';
    if (qualityScore >= 60) return 'Solid profile with multiple verified signal sources';
    if (qualityScore >= 40) return `Profile based on ${present.join(', ')} signals`;
    if (qualityScore >= 20) return 'Early-stage profile — add more signals to strengthen';
    return 'Minimal data — profile will improve as more signals are added';
  }
}

module.exports = new ConvictionWeightService();
