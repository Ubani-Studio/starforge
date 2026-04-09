/**
 * Cross-Modal Coherence Analyzer
 * Analyzes alignment between Visual DNA (Tizita) and Audio DNA
 * Unique feature: nobody else does cross-modal aesthetic analysis
 */
class CrossModalAnalyzer {
  constructor() {
    // Mapping constants for cross-modal comparison
    this.warmthMap = {
      // Visual color palette → Audio tonal characteristics
      'warm-toned': ['warm', 'organic'],
      'cool-toned': ['bright', 'metallic'],
      'monochrome': ['dark', 'neutral'],
      'high-contrast': ['bright', 'metallic'],
      'balanced': ['balanced', 'neutral']
    };
  }

  /**
   * Analyze cross-modal coherence between visual, audio, and optionally writing DNA
   */
  analyzeCrossModalCoherence(visualDNA, audioDNA, writingDNA) {
    if (!visualDNA || !audioDNA) {
      return {
        overall: 0,
        audioVisualMatch: 0,
        energyAlignment: 0,
        diversityAlignment: 0,
        writingAlignment: 0,
        details: {
          message: 'Missing visual or audio DNA'
        }
      };
    }

    // 1. Audio-Visual Match (warmth/tonal correspondence)
    const audioVisualMatch = this.compareWarmth(
      visualDNA.paletteCharacteristics,
      audioDNA.tonalCharacteristics
    );

    // 2. Energy Alignment (visual themes vs audio energy)
    const energyAlignment = this.compareEnergy(
      visualDNA,
      audioDNA
    );

    // 3. Diversity Alignment (color diversity vs genre diversity)
    const diversityAlignment = this.compareDiversity(
      visualDNA,
      audioDNA
    );

    // 4. Writing alignment (if WritingDNA available)
    let writingAlignment = null;
    let writingTension = null;
    if (writingDNA && writingDNA.metrics) {
      const wa = this.analyzeWritingCoherence(writingDNA, visualDNA, audioDNA);
      writingAlignment = wa.alignment;
      writingTension = wa.tension;
    }

    // Overall coherence (rebalance weights if writing available)
    let overall;
    if (writingAlignment != null) {
      overall = (
        audioVisualMatch * 0.3 +
        energyAlignment * 0.25 +
        diversityAlignment * 0.2 +
        writingAlignment * 0.25
      );
    } else {
      overall = (
        audioVisualMatch * 0.4 +
        energyAlignment * 0.35 +
        diversityAlignment * 0.25
      );
    }

    return {
      overall: Math.round(overall * 100) / 100,
      audioVisualMatch: Math.round(audioVisualMatch * 100) / 100,
      energyAlignment: Math.round(energyAlignment * 100) / 100,
      diversityAlignment: Math.round(diversityAlignment * 100) / 100,
      writingAlignment: writingAlignment != null ? Math.round(writingAlignment * 100) / 100 : null,
      writingTension: writingTension,
      details: {
        visualPalette: visualDNA.paletteCharacteristics,
        audioTonal: audioDNA.tonalCharacteristics,
        interpretation: this.generateInterpretation(overall, writingTension)
      }
    };
  }

  /**
   * Analyze how writing style aligns with visual and audio aesthetic.
   * Returns both alignment (0-1) and creative tension description.
   *
   * Short sentences + minimal music + stark visuals = high coherence
   * Lush prose + harsh noise = creative tension (valuable signal, not penalty)
   */
  analyzeWritingCoherence(writingDNA, visualDNA, audioDNA) {
    const m = writingDNA.metrics || {};
    const p = writingDNA.patterns || {};

    // Infer writing "energy" from metrics
    const sentenceEnergy = Math.min(1, (m.avgSentenceLength || 15) / 30); // long = high
    const exclamationEnergy = Math.min(1, (m.exclamationFrequency || 0) * 5);
    const writingEnergy = sentenceEnergy * 0.6 + exclamationEnergy * 0.4;

    // Infer writing "density" from vocabulary
    const writingDensity = m.typeTokenRatio || 0.5;

    // Compare to audio energy
    const audioEnergy = audioDNA.avgEnergy || 0.5;
    const energyDiff = Math.abs(writingEnergy - audioEnergy);

    // Compare to visual energy
    const visualEnergy = this.inferVisualEnergy(visualDNA);
    const visualDiff = Math.abs(writingEnergy - visualEnergy);

    // Alignment = inverse of average difference
    const alignment = 1 - (energyDiff * 0.5 + visualDiff * 0.5);

    // Detect creative tension (when writing diverges sharply from other modalities)
    let tension = null;
    if (energyDiff > 0.4 || visualDiff > 0.4) {
      const writingStyle = writingEnergy > 0.6 ? 'expansive, high-energy prose' : 'terse, minimal writing';
      const audioStyle = audioEnergy > 0.6 ? 'high-energy music' : 'subdued, atmospheric music';
      const visualStyle = visualEnergy > 0.6 ? 'dynamic visuals' : 'contemplative imagery';

      tension = {
        description: `${writingStyle} paired with ${audioStyle} and ${visualStyle}`,
        type: energyDiff > visualDiff ? 'writing-audio tension' : 'writing-visual tension',
        magnitude: Math.max(energyDiff, visualDiff),
      };
    }

    return {
      alignment: Math.max(0, Math.min(1, alignment)),
      tension,
    };
  }

  /**
   * Compare warmth between visual and audio
   * Visual: warm-toned/cool-toned/monochrome
   * Audio: warm/bright/dark/metallic/organic
   */
  compareWarmth(visualPalette, audioTonal) {
    if (!visualPalette || !audioTonal) return 0.5;

    // Extract keywords from audio tonal description
    const audioKeywords = audioTonal.toLowerCase().split(' ');

    // Get expected audio characteristics for this visual palette
    const expectedAudioChars = this.warmthMap[visualPalette] || ['balanced'];

    // Calculate match score
    let matchCount = 0;
    for (const expected of expectedAudioChars) {
      if (audioKeywords.includes(expected)) {
        matchCount++;
      }
    }

    // Score: proportion of expected characteristics found
    const score = matchCount / expectedAudioChars.length;

    // Boost score for perfect matches
    if (matchCount === expectedAudioChars.length) {
      return Math.min(1.0, score * 1.2);
    }

    return Math.max(0.3, score); // Minimum 0.3 for partial matches
  }

  /**
   * Compare energy levels between visual themes and audio
   * Visual: high-rated photo count, dominant themes
   * Audio: average energy, BPM
   */
  compareEnergy(visualDNA, audioDNA) {
    // Infer visual energy from photo characteristics
    const visualEnergy = this.inferVisualEnergy(visualDNA);

    // Get audio energy
    const audioEnergy = audioDNA.avgEnergy || 0.5;

    // Calculate alignment (1 - normalized difference)
    const diff = Math.abs(visualEnergy - audioEnergy);
    const alignment = 1 - diff;

    return Math.max(0, Math.min(1, alignment));
  }

  /**
   * Infer energy level from visual DNA
   * Based on photo themes, color characteristics
   */
  inferVisualEnergy(visualDNA) {
    let energy = 0.5; // Default neutral

    const palette = visualDNA.paletteCharacteristics || '';
    const themes = visualDNA.dominantThemes || [];
    const style = visualDNA.styleDescription || '';

    // High-energy visual indicators
    const highEnergyThemes = ['action', 'city', 'event', 'group'];
    const lowEnergyThemes = ['portrait', 'indoor', 'artistic', 'nature'];

    // Check themes
    const hasHighEnergy = themes.some(t => highEnergyThemes.includes(t.toLowerCase()));
    const hasLowEnergy = themes.some(t => lowEnergyThemes.includes(t.toLowerCase()));

    if (hasHighEnergy) energy += 0.2;
    if (hasLowEnergy) energy -= 0.2;

    // Check palette
    if (palette.includes('high-contrast') || palette.includes('bright')) {
      energy += 0.15;
    }
    if (palette.includes('monochrome') || palette.includes('muted')) {
      energy -= 0.15;
    }

    // Check style description
    if (style.includes('energetic') || style.includes('dynamic')) {
      energy += 0.1;
    }
    if (style.includes('calm') || style.includes('minimal')) {
      energy -= 0.1;
    }

    return Math.max(0, Math.min(1, energy));
  }

  /**
   * Compare diversity between visual and audio
   * Visual: color palette diversity
   * Audio: genre/key/mood diversity
   */
  compareDiversity(visualDNA, audioDNA) {
    // Visual diversity: number of colors in palette
    const visualColorCount = visualDNA.colorPalette?.length || 0;
    const visualDiversity = Math.min(1, visualColorCount / 5); // 5 colors = max diversity

    // Audio diversity: from taste coherence (inverse of coherence = diversity)
    const audioCoherence = audioDNA.tasteCoherence?.overall || 0.5;
    const audioDiversity = 1 - audioCoherence;

    // Calculate alignment (1 - normalized difference)
    const diff = Math.abs(visualDiversity - audioDiversity);
    const alignment = 1 - diff;

    return Math.max(0, Math.min(1, alignment));
  }

  /**
   * Generate human-readable interpretation
   */
  generateInterpretation(overallScore, writingTension) {
    let base;
    if (overallScore >= 0.8) {
      base = 'Highly aligned aesthetic across all modalities';
    } else if (overallScore >= 0.6) {
      base = 'Strong coherence between visual, audio, and writing';
    } else if (overallScore >= 0.4) {
      base = 'Moderate alignment with creative divergence';
    } else {
      base = 'Distinct aesthetic approaches across modalities';
    }

    if (writingTension) {
      base += `. Creative tension: ${writingTension.description}`;
    }

    return base;
  }

  /**
   * Generate detailed cross-modal report
   */
  generateDetailedReport(visualDNA, audioDNA, coherence) {
    const report = {
      summary: coherence.details.interpretation,
      overall: coherence.overall,

      visualProfile: {
        style: visualDNA.styleDescription,
        palette: visualDNA.paletteCharacteristics,
        photoCount: visualDNA.photoCount,
        confidence: visualDNA.confidence
      },

      audioProfile: {
        tonal: audioDNA.tonalCharacteristics,
        trackCount: audioDNA.trackCount,
        coherence: audioDNA.tasteCoherence?.overall,
        dominantFrequencies: audioDNA.dominantFrequencies
      },

      alignmentMetrics: {
        audioVisualMatch: {
          score: coherence.audioVisualMatch,
          description: this.describeAudioVisualMatch(coherence.audioVisualMatch)
        },
        energyAlignment: {
          score: coherence.energyAlignment,
          description: this.describeEnergyAlignment(coherence.energyAlignment)
        },
        diversityAlignment: {
          score: coherence.diversityAlignment,
          description: this.describeDiversityAlignment(coherence.diversityAlignment)
        }
      },

      recommendations: this.generateRecommendations(coherence)
    };

    return report;
  }

  describeAudioVisualMatch(score) {
    if (score >= 0.8) return 'Strong tonal-palette correspondence';
    if (score >= 0.6) return 'Good aesthetic alignment';
    if (score >= 0.4) return 'Moderate correspondence';
    return 'Contrasting aesthetic approaches';
  }

  describeEnergyAlignment(score) {
    if (score >= 0.8) return 'Visual and audio energy highly aligned';
    if (score >= 0.6) return 'Complementary energy levels';
    if (score >= 0.4) return 'Some energy contrast';
    return 'Distinct energy signatures';
  }

  describeDiversityAlignment(score) {
    if (score >= 0.8) return 'Consistent diversity across modalities';
    if (score >= 0.6) return 'Similar exploration patterns';
    if (score >= 0.4) return 'Moderate diversity differences';
    return 'Different diversity preferences';
  }

  generateRecommendations(coherence) {
    const recs = [];

    if (coherence.audioVisualMatch < 0.5) {
      recs.push('Consider exploring audio that matches your visual aesthetic more closely');
    }

    if (coherence.energyAlignment < 0.5) {
      recs.push('Your visual and audio energy levels diverge - this creates interesting contrast');
    }

    if (coherence.diversityAlignment < 0.5) {
      recs.push('Different diversity approaches across visual/audio - explore cross-pollination');
    }

    if (coherence.overall >= 0.7) {
      recs.push('Strong cross-modal coherence - your aesthetic DNA is highly integrated');
    }

    return recs;
  }
}

module.exports = new CrossModalAnalyzer();
