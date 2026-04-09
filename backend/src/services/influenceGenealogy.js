const genreTaxonomy = require('./genreTaxonomy');
const Database = require('better-sqlite3');
const path = require('path');

/**
 * Influence Genealogy Service
 * Matches user's sonic palette to genre lineages
 * Elite tier feature - shows taste evolution and heritage
 */
class InfluenceGenealogyService {
  constructor() {
    this._cache = new Map();
    this._cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  _getCacheKey(userId, mode) {
    return `${userId}:${mode}`;
  }

  /**
   * Analyze user's music and generate influence genealogy
   */
  async analyzeInfluenceGenealogy(userId, options = {}) {
    try {
      const { mode = 'hybrid' } = options;

      // Check cache first
      const cacheKey = this._getCacheKey(userId, mode);
      const cached = this._cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < this._cacheTTL)) {
        return cached.data;
      }

      // Get user's audio data filtered by mode
      const audioDb = new Database(path.join(__dirname, '../../starforge_audio.db'));

      let query = 'SELECT * FROM audio_tracks WHERE user_id = ?';
      const params = [userId];

      // Filter by source based on mode
      if (mode === 'dj') {
        query += ' AND source LIKE ?';
        params.push('%rekordbox%');
      } else if (mode === 'original') {
        query += ' AND source = ?';
        params.push('upload');
      }
      // hybrid mode = no filter, get all tracks

      const tracks = audioDb.prepare(query).all(...params);
      audioDb.close();

      if (tracks.length === 0) {
        return {
          available: false,
          message: 'No audio tracks available. Upload music to analyze your influence genealogy.'
        };
      }

      // NUANCED ANALYSIS: Cluster tracks into sonic groups
      const clusters = this.clusterTracksByGenre(tracks);

      if (clusters.length === 0) {
        return {
          available: false,
          message: 'Could not match your music to genre lineages.'
        };
      }

      // Get top cluster as primary
      const primaryCluster = clusters[0];
      const lineage = genreTaxonomy.getLineage(primaryCluster.genreId);
      const descendants = genreTaxonomy.getDescendants(primaryCluster.genreId);

      // Generate narrative with multiple influences
      const narrative = this.generateMultiInfluenceNarrative(clusters, tracks.length);

      // Build visual tree data
      const treeData = this.buildTreeData(lineage, descendants, primaryCluster);

      // Mode-specific context
      let modeContext = '';
      if (mode === 'dj') {
        modeContext = ' (DJ Library Analysis - based on what you play and rate in sets)';
      } else if (mode === 'original') {
        modeContext = ' (Your Music Analysis - based on what you create and produce)';
      } else {
        modeContext = ' (Hybrid Analysis - combining your DJ curation and original productions)';
      }

      const result = {
        available: true,
        mode: mode,
        modeContext: modeContext,
        // Multiple influences with percentages
        influences: clusters.map(c => ({
          genre: c.genre,
          percentage: c.percentage,
          trackCount: c.trackCount,
          avgBpm: c.avgBpm,
          avgEnergy: c.avgEnergy,
          avgValence: c.avgValence
        })),
        primaryGenre: primaryCluster.genre,
        matchScore: primaryCluster.percentage,
        lineage: lineage,
        descendants: descendants.slice(0, 5),
        narrative: narrative + modeContext,
        treeData: treeData,
        trackCount: tracks.length
      };

      // Cache the result
      this._cache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;

    } catch (error) {
      console.error('Error analyzing influence genealogy:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Cluster tracks by genre (with preference weighting)
   * Returns multiple influences with percentages
   */
  clusterTracksByGenre(tracks) {
    const weights = this.calculatePreferenceWeights(tracks);
    const allGenres = genreTaxonomy.db.prepare('SELECT * FROM genres').all();

    // Match each track to genres
    const trackGenreMatches = tracks.map((track, i) => {
      const matches = allGenres
        .map(genre => ({
          genre,
          score: this.calculateTrackGenreMatch(track, genre),
          hasParent: genre.parent_id !== null
        }))
        .filter(m => m.score > 30)
        .sort((a, b) => {
          // First, sort by score
          if (Math.abs(a.score - b.score) > 5) {
            return b.score - a.score;
          }
          // If scores are close (within 5 points), prefer child genres over parent genres
          // This ensures we get Grime instead of Hip Hop, Afro House instead of Afrobeat
          if (a.hasParent && !b.hasParent) return -1; // a is child, b is parent -> prefer a
          if (!a.hasParent && b.hasParent) return 1;  // a is parent, b is child -> prefer b
          return b.score - a.score;
        });

      return {
        track,
        weight: weights[i],
        bestMatch: matches[0] || null
      };
    });

    // Group by genre and calculate weighted percentages
    const genreClusters = {};
    let totalWeight = 0;

    trackGenreMatches.forEach(({ track, weight, bestMatch }) => {
      if (!bestMatch) return;

      const genreId = bestMatch.genre.id;
      if (!genreClusters[genreId]) {
        genreClusters[genreId] = {
          genreId,
          genre: bestMatch.genre,
          weightedCount: 0,
          bpms: [],
          energies: [],
          valences: []
        };
      }

      genreClusters[genreId].weightedCount += weight;
      totalWeight += weight;

      // Use effective_bpm for stats (shows actual perceived tempo)
      const bpmForStats = track.effective_bpm || track.bpm;
      if (bpmForStats) genreClusters[genreId].bpms.push(bpmForStats);
      if (track.energy !== null) genreClusters[genreId].energies.push(track.energy);
      if (track.valence !== null) genreClusters[genreId].valences.push(track.valence);
    });

    // Calculate percentages and averages
    const clusters = Object.values(genreClusters)
      .map(cluster => ({
        ...cluster,
        percentage: parseFloat(((cluster.weightedCount / totalWeight) * 100).toFixed(1)),
        trackCount: Math.round(cluster.weightedCount * 10) / 10,
        avgBpm: cluster.bpms.length > 0
          ? Math.round(cluster.bpms.reduce((a, b) => a + b, 0) / cluster.bpms.length)
          : null,
        avgEnergy: cluster.energies.length > 0
          ? parseFloat((cluster.energies.reduce((a, b) => a + b, 0) / cluster.energies.length).toFixed(2))
          : null,
        avgValence: cluster.valences.length > 0
          ? parseFloat((cluster.valences.reduce((a, b) => a + b, 0) / cluster.valences.length).toFixed(2))
          : null
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 15); // Top 15 influences (show more granular subgenres)

    return clusters;
  }

  /**
   * Match individual track to genre
   */
  calculateTrackGenreMatch(track, genre) {
    if (!track.bpm) return 0;

    // Use effective_bpm (half-time adjusted) if available, otherwise use raw bpm
    const bpmForMatching = track.effective_bpm || track.bpm;

    // CONFLICTING GENRE EXCLUSIONS
    // For ambiguous BPM ranges (140 BPM overlap zone), exclude tracks with conflicting genre tags
    if (track.genre) {
      const trackGenre = track.genre.toLowerCase().trim();
      const genreSlug = genre.slug;

      // Jersey Club exclusions: Don't match if tagged as Techno, Grime, Dubstep, Trap, Garage
      if (genreSlug === 'jersey-club') {
        const conflictingTags = ['techno', 'grime', 'dubstep', 'trap', 'garage', 'dnb', 'drum', 'bass'];
        if (conflictingTags.some(tag => trackGenre.includes(tag))) {
          return 0; // Skip match entirely
        }
      }

      // Similar exclusions for other narrow-range genres at 140 BPM
      if (genreSlug === 'grime') {
        if (['jersey', 'club', 'baltimore'].some(tag => trackGenre.includes(tag))) {
          return 0;
        }
      }

      if (genreSlug === 'dubstep') {
        if (['jersey', 'baltimore', 'grime'].some(tag => trackGenre.includes(tag))) {
          return 0;
        }
      }
    }

    // Genre tag match (if Rekordbox has genre metadata)
    let genreTagBonus = 0;
    if (track.genre) {
      const trackGenre = track.genre.toLowerCase().trim();
      const genreName = genre.name.toLowerCase();

      // Exact match or close match
      if (trackGenre === genreName) {
        genreTagBonus = 40; // Strong bonus for exact match
      } else if (trackGenre.includes(genreName) || genreName.includes(trackGenre)) {
        genreTagBonus = 25; // Moderate bonus for partial match
      } else if (
        // Special cases for common variations
        (trackGenre.includes('grime') && genreName.includes('grime')) ||
        (trackGenre.includes('garage') && (genreName.includes('garage') || genreName.includes('ukg'))) ||
        (trackGenre.includes('trap') && genreName.includes('trap')) ||
        (trackGenre.includes('house') && genreName.includes('house')) ||
        (trackGenre.includes('afro') && genreName.includes('afro'))
      ) {
        genreTagBonus = 30;
      }
    }

    // BPM match - prefer genres where track BPM falls well within range
    // Use effective_bpm for half-time tracks (e.g., 178 BPM half-time → 89 BPM feel)
    let bpmScore = 0;

    if (bpmForMatching >= genre.bpm_min && bpmForMatching <= genre.bpm_max) {
      // Track is within range - calculate how central it is
      const rangeSize = genre.bpm_max - genre.bpm_min;
      const genreBpmMid = (genre.bpm_min + genre.bpm_max) / 2;
      const distanceFromMid = Math.abs(bpmForMatching - genreBpmMid);
      const centralityScore = 1 - (distanceFromMid / (rangeSize / 2));

      // Strong bonus for narrower ranges (more specific genres like Grime vs broad genres like Trap)
      // Narrow ranges (7-10 BPM) get high bonus, wide ranges (30+ BPM) get low bonus
      const rangeSpecificityBonus = Math.max(0, 1 - (rangeSize / 30));

      // Weight specificity more heavily (60%) to prefer narrow, specific genres
      bpmScore = (centralityScore * 0.4) + (rangeSpecificityBonus * 0.6);
    } else {
      // Track is outside range - penalize based on distance
      const genreBpmMid = (genre.bpm_min + genre.bpm_max) / 2;
      const bpmDistance = Math.abs(bpmForMatching - genreBpmMid);
      bpmScore = Math.max(0, 0.5 - (bpmDistance / 40));
    }

    // Energy match (prioritize Spotify energy if available)
    const energyValue = track.spotify_energy || track.energy;

    if (energyValue !== null && energyValue !== undefined) {
      const genreEnergyMid = (genre.energy_min + genre.energy_max) / 2;
      const energyDistance = Math.abs(energyValue - genreEnergyMid);
      const energyScore = Math.max(0, 1 - (energyDistance * 2));

      // Higher energy weight (40% instead of 30%) for more accurate matching
      const totalScore = (bpmScore * 0.5 + energyScore * 0.4) * 100 + genreTagBonus;

      // ADDITIONAL FILTER for 140 BPM overlap zone:
      // If genre is Jersey Club/Grime/Dubstep and track is at 140 BPM,
      // require genre tag support OR strong energy match
      const isOverlapZone = bpmForMatching >= 138 && bpmForMatching <= 143;
      if (isOverlapZone && ['jersey-club', 'grime', 'dubstep'].includes(genre.slug)) {
        if (genreTagBonus === 0 && energyScore < 0.7) {
          return totalScore * 0.3; // Heavily penalize ambiguous matches
        }
      }

      return totalScore;
    }

    // No energy data - use BPM + genre tag only
    // For 140 BPM overlap zone without energy, require strong genre tag support
    const isOverlapZone = bpmForMatching >= 138 && bpmForMatching <= 143;
    if (isOverlapZone && ['jersey-club', 'grime', 'dubstep'].includes(genre.slug)) {
      if (genreTagBonus < 25) {
        return (bpmScore * 100 + genreTagBonus) * 0.2; // Heavy penalty without tag support
      }
    }

    return (bpmScore * 100) + genreTagBonus;
  }

  /**
   * Generate narrative with multiple influences
   */
  generateMultiInfluenceNarrative(clusters, totalTracks) {
    if (clusters.length === 0) return 'Your taste defies traditional classification.';

    const primary = clusters[0];
    const lineage = genreTaxonomy.getLineage(primary.genreId);

    let narrative = `Your taste spans ${clusters.length} distinct influences across ${totalTracks} tracks:\n\n`;

    clusters.forEach((cluster, i) => {
      const genre = cluster.genre;
      narrative += `${i + 1}. ${genre.name} (${cluster.percentage}%) - ${genre.cultural_context}\n`;
    });

    if (lineage.length > 1) {
      narrative += `\nPrimary lineage traces: ${lineage.map(g => g.name).join(' → ')}`;
    }

    return narrative;
  }

  /**
   * Calculate preference weight (play count + star rating)
   */
  calculatePreferenceWeights(tracks) {
    const maxPlayCount = Math.max(...tracks.map(t => t.rekordbox_play_count || t.play_count || 0), 1);

    return tracks.map(track => {
      const playCount = track.rekordbox_play_count || track.play_count || 0;
      const rating = track.rekordbox_star_rating || track.star_rating || 0;

      const normalizedPlayCount = playCount / maxPlayCount;
      const normalizedRating = rating / 255; // Rekordbox stores ratings as 0-255

      // 60% play count (revealed), 40% rating (conscious)
      const weight = (normalizedPlayCount * 0.6) + (normalizedRating * 0.4);
      return weight > 0 ? weight : 0.1;
    });
  }

  /**
   * Weighted average helper
   */
  weightedAverage(values, weights) {
    if (values.length === 0) return 0;
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight === 0) return values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;
  }

  /**
   * Calculate user sonic signature (PREFERENCE WEIGHTED)
   */
  calculateUserSonicSignature(tracks) {
    const weights = this.calculatePreferenceWeights(tracks);

    // Get tracks with BPM and their weights
    const bpms = [];
    const bpmWeights = [];
    tracks.forEach((t, i) => {
      if (t.bpm && t.bpm > 0) {
        bpms.push(t.bpm);
        bpmWeights.push(weights[i]);
      }
    });

    // Get tracks with energy and their weights
    const energies = [];
    const energyWeights = [];
    tracks.forEach((t, i) => {
      if (t.energy !== null && t.energy !== undefined) {
        energies.push(t.energy);
        energyWeights.push(weights[i]);
      }
    });

    // Get tracks with valence and their weights
    const valences = [];
    const valenceWeights = [];
    tracks.forEach((t, i) => {
      if (t.valence !== null && t.valence !== undefined) {
        valences.push(t.valence);
        valenceWeights.push(weights[i]);
      }
    });

    const avgBpm = this.weightedAverage(bpms, bpmWeights) || 120;
    const avgEnergy = this.weightedAverage(energies, energyWeights) || 0.5;
    const avgValence = this.weightedAverage(valences, valenceWeights) || 0.5;

    const bpmVariance = this.calculateVariance(bpms);
    const energyVariance = this.calculateVariance(energies);
    const valenceVariance = this.calculateVariance(valences);

    return {
      avgBpm: Math.round(avgBpm),
      avgEnergy: parseFloat(avgEnergy.toFixed(2)),
      avgValence: parseFloat(avgValence.toFixed(2)),
      bpmVariance: parseFloat(bpmVariance.toFixed(2)),
      energyVariance: parseFloat(energyVariance.toFixed(2)),
      valenceVariance: parseFloat(valenceVariance.toFixed(2)),
      trackCount: tracks.length
    };
  }

  findMatchingGenres(userSignature) {
    const allGenres = genreTaxonomy.db.prepare('SELECT * FROM genres').all();
    const matches = [];

    allGenres.forEach(genre => {
      const score = this.calculateMatchScore(userSignature, genre);
      if (score > 0) {
        matches.push({
          genreId: genre.id,
          genre: genre,
          score: parseFloat(score.toFixed(2))
        });
      }
    });

    return matches.sort((a, b) => b.score - a.score);
  }

  calculateMatchScore(userSignature, genre) {
    const genreBpmMid = (genre.bpm_min + genre.bpm_max) / 2;
    const genreBpmRange = genre.bpm_max - genre.bpm_min;
    const bpmDistance = Math.abs(userSignature.avgBpm - genreBpmMid);
    const bpmScore = Math.max(0, 1 - (bpmDistance / (genreBpmRange + 20)));

    const genreEnergyMid = (genre.energy_min + genre.energy_max) / 2;
    const energyDistance = Math.abs(userSignature.avgEnergy - genreEnergyMid);
    const energyScore = Math.max(0, 1 - (energyDistance * 2));

    const currentYear = new Date().getFullYear();
    const genreAge = genre.era_start ? currentYear - genre.era_start : 30;
    const eraScore = Math.max(0.3, 1 - (genreAge / 100));

    const totalScore = (bpmScore * 0.4) + (energyScore * 0.3) + (eraScore * 0.3);

    return totalScore * 100;
  }

  generateNarrative(lineage, primaryMatch, userSignature) {
    if (lineage.length === 0) {
      return 'Your musical taste is unique and defies traditional genre classification.';
    }

    const root = lineage[0];
    const current = lineage[lineage.length - 1];

    const narrativeParts = [];

    narrativeParts.push(
      'Your taste descends from ' + root.name + ' (' + root.decade + '), ' +
      'originating in ' + root.origin_location + '.'
    );

    if (lineage.length > 2) {
      const middle = lineage.slice(1, -1).map(g => g.name + ' (' + g.decade + ')').join(', ');
      narrativeParts.push(
        'It evolved through ' + middle + ', reflecting the cultural shifts of each era.'
      );
    }

    narrativeParts.push(
      'Today, your sound aligns most closely with ' + current.name + ' ' +
      '(' + Math.round(primaryMatch.score) + '% match), characterized by ' +
      current.description.toLowerCase() + '.'
    );

    const valenceLabel = userSignature.avgValence >= 0.6 ? 'uplifting' :
                         userSignature.avgValence >= 0.4 ? 'balanced' : 'darker';

    narrativeParts.push(
      'Your sonic signature: ' + userSignature.avgBpm + ' BPM average, ' +
      (userSignature.avgEnergy * 100).toFixed(0) + '% energy, ' +
      valenceLabel + ' mood (' + (userSignature.avgValence * 100).toFixed(0) + '% valence).'
    );

    return narrativeParts.join(' ');
  }

  buildTreeData(lineage, descendants, primaryMatch) {
    const nodes = [];
    const edges = [];

    lineage.forEach((genre, index) => {
      nodes.push({
        id: 'genre-' + genre.id,
        label: genre.name,
        era: genre.decade,
        type: index === lineage.length - 1 ? 'current' : 'ancestor',
        description: genre.description
      });

      if (index > 0) {
        edges.push({
          from: 'genre-' + lineage[index - 1].id,
          to: 'genre-' + genre.id,
          label: genre.era_start
        });
      }
    });

    const currentGenre = lineage[lineage.length - 1];
    nodes.push({
      id: 'user-current',
      label: 'Your Taste (2026)',
      era: '2020s',
      type: 'user',
      description: primaryMatch.score + '% match to ' + currentGenre.name
    });

    edges.push({
      from: 'genre-' + currentGenre.id,
      to: 'user-current',
      label: '2026'
    });

    descendants.slice(0, 3).forEach(genre => {
      nodes.push({
        id: 'genre-' + genre.id,
        label: genre.name,
        era: genre.decade,
        type: 'descendant',
        description: genre.description
      });

      edges.push({
        from: 'user-current',
        to: 'genre-' + genre.id,
        label: genre.era_start,
        style: 'dashed'
      });
    });

    return { nodes, edges };
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
  }
}

module.exports = new InfluenceGenealogyService();
