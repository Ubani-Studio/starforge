/**
 * Art Movement Classifier
 *
 * Uses high-signal photos (best, favourites, star-rated) from Tizita
 * to compute more accurate art movement affinities.
 *
 * Signal hierarchy:
 *   best_photo  = weight 3.0 (user's peak identity)
 *   favorite    = weight 2.0 (strong preference)
 *   rating >= 4 = weight 1.5 (liked)
 *   rating <= 2 = weight -1.0 (anti-signal)
 */

const tizitaDirectService = require('./tizitaServiceDirect');

/**
 * Parse a SigLIP embedding from SQLite binary blob to Float32Array
 */
function parseEmbedding(buffer) {
  if (!buffer || buffer.length === 0) return null;
  try {
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
  } catch {
    return null;
  }
}

/**
 * Compute weighted centroid from photos with embeddings
 */
function computeWeightedCentroid(photoGroups) {
  const dim = 768;
  const centroid = new Float64Array(dim);
  let totalWeight = 0;

  for (const { photos, weight } of photoGroups) {
    for (const photo of photos) {
      const emb = parseEmbedding(photo.siglip_embedding);
      if (!emb || emb.length !== dim) continue;

      for (let i = 0; i < dim; i++) {
        centroid[i] += emb[i] * weight;
      }
      totalWeight += Math.abs(weight);
    }
  }

  if (totalWeight === 0) return null;

  // Normalize
  for (let i = 0; i < dim; i++) {
    centroid[i] /= totalWeight;
  }

  return centroid;
}

/**
 * Extract visual characteristics from an embedding vector
 * Same dimensional analysis as Tizita's calculate_deep_analysis
 * but applied to the high-signal centroid
 */
function extractCharacteristics(vec) {
  const lowLevel = vec.slice(0, 256);
  const midLevel = vec.slice(256, 512);
  const highLevel = vec.slice(512);

  // Warmth: early dimensions
  const warmthDims = vec.slice(0, 128);
  const warmthMean = warmthDims.reduce((a, b) => a + b, 0) / warmthDims.length;
  const warmth = Math.max(0, Math.min(1, 0.5 + warmthMean * 2));

  // Energy: variance across vector
  const mean = vec.reduce((a, b) => a + b, 0) / vec.length;
  const variance = vec.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vec.length;
  const energy = Math.max(0, Math.min(1, Math.sqrt(variance) * 3));

  // Contrast: spread
  let min = Infinity, max = -Infinity;
  for (const v of vec) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const contrast = Math.max(0, Math.min(1, (max - min) * 0.5));

  // Complexity: std dev
  const complexity = Math.sqrt(variance);

  // Symmetry: inverse of mid-level variance
  const midMean = midLevel.reduce((a, b) => a + b, 0) / midLevel.length;
  const midVar = midLevel.reduce((sum, v) => sum + (v - midMean) ** 2, 0) / midLevel.length;
  const symmetry = Math.max(0, Math.min(1, 1 - Math.sqrt(midVar) * 2));

  // Organic vs geometric
  const highMean = highLevel.slice(0, 128).reduce((a, b) => a + b, 0) / 128;
  const organic = Math.max(0, Math.min(1, highMean + 0.5));
  const geometric = 1 - organic;

  return { warmth, energy, contrast, complexity, symmetry, organic, geometric };
}

/**
 * Score art movements from characteristics
 * Same movement set as Tizita's calculate_deep_analysis
 */
function scoreMovements(chars) {
  const { warmth, energy, contrast, complexity, symmetry, organic, geometric } = chars;
  const scores = {};

  // Western
  scores["Bauhaus"] = (contrast * 0.4) + (geometric * 0.3) + ((1 - energy) * 0.3);
  scores["Brutalism"] = (contrast * 0.5) + ((1 - warmth) * 0.3) + (geometric * 0.2);
  scores["Memphis"] = (energy * 0.4) + (warmth * 0.3) + (complexity * 0.3);
  scores["Minimalism"] = ((1 - energy) * 0.4) + ((1 - contrast) * 0.3) + ((1 - complexity) * 0.3);
  scores["Swiss Design"] = (contrast * 0.3) + (geometric * 0.4) + ((1 - warmth) * 0.3);
  scores["Art Deco"] = (warmth * 0.3) + (contrast * 0.3) + (geometric * 0.4);
  scores["Art Nouveau"] = (organic * 0.4) + (warmth * 0.3) + (complexity * 0.3);

  // Japanese
  scores["Wabi-sabi"] = ((1 - energy) * 0.3) + ((1 - contrast) * 0.3) + (organic * 0.2) + (warmth * 0.2);
  scores["Ma (Negative Space)"] = ((1 - energy) * 0.5) + ((1 - complexity) * 0.3) + (symmetry * 0.2);
  scores["Kanso (Simplicity)"] = ((1 - complexity) * 0.4) + ((1 - energy) * 0.3) + ((1 - contrast) * 0.3);

  // African
  scores["Kente Aesthetic"] = (energy * 0.3) + (warmth * 0.3) + (contrast * 0.2) + (geometric * 0.2);
  scores["Ndebele Geometric"] = (contrast * 0.4) + (geometric * 0.3) + (energy * 0.3);
  scores["Ankara/African Print"] = (energy * 0.4) + (warmth * 0.3) + (complexity * 0.3);
  scores["Adinkra (Ashanti Symbol)"] = (geometric * 0.4) + (symmetry * 0.3) + ((1 - energy) * 0.3);
  scores["Nsibidi (Igbo Script)"] = (geometric * 0.3) + ((1 - energy) * 0.3) + (contrast * 0.2) + (organic * 0.2);
  scores["Ba-ila Fractal (Zambia)"] = (geometric * 0.3) + (symmetry * 0.2) + (complexity * 0.3) + (organic * 0.2);
  scores["Bogolan/Mudcloth (Mali)"] = (warmth * 0.3) + ((1 - energy) * 0.3) + (organic * 0.2) + (contrast * 0.2);
  scores["Adire (Yoruba Indigo)"] = ((1 - energy) * 0.3) + (organic * 0.3) + (contrast * 0.2) + ((1 - warmth) * 0.2);
  scores["Tingatinga (Tanzania)"] = (energy * 0.3) + (warmth * 0.3) + (organic * 0.2) + (contrast * 0.2);

  // Middle Eastern
  scores["Islamic Geometric"] = (geometric * 0.5) + (symmetry * 0.3) + ((1 - organic) * 0.2);
  scores["Arabesque"] = (organic * 0.3) + (complexity * 0.4) + (symmetry * 0.3);
  scores["Persian Miniature"] = (complexity * 0.4) + (warmth * 0.3) + (energy * 0.3);

  // East Asian
  scores["Shan Shui (Chinese Landscape)"] = (organic * 0.4) + ((1 - energy) * 0.3) + ((1 - contrast) * 0.3);
  scores["Dancheong (Korean)"] = (warmth * 0.3) + (contrast * 0.3) + (geometric * 0.2) + (complexity * 0.2);
  scores["Shibori (Japanese Dye)"] = (organic * 0.3) + ((1 - energy) * 0.3) + ((1 - contrast) * 0.2) + (complexity * 0.2);
  scores["Ukiyo-e (Japanese Woodblock)"] = (contrast * 0.3) + (organic * 0.3) + (warmth * 0.2) + (complexity * 0.2);
  scores["Batik (Indonesian)"] = (complexity * 0.3) + (organic * 0.3) + (warmth * 0.2) + (symmetry * 0.2);

  // South Asian
  scores["Madhubani"] = (complexity * 0.4) + (warmth * 0.3) + (organic * 0.3);
  scores["Mughal Miniature"] = (complexity * 0.4) + (warmth * 0.3) + (symmetry * 0.3);
  scores["Rangoli"] = (geometric * 0.3) + (symmetry * 0.4) + (warmth * 0.3);
  scores["Warli (Maharashtra)"] = ((1 - complexity) * 0.3) + (geometric * 0.3) + ((1 - energy) * 0.2) + (organic * 0.2);
  scores["Jali (Lattice Screen)"] = (geometric * 0.4) + (symmetry * 0.3) + ((1 - energy) * 0.3);

  // Latin American
  scores["Muralism"] = (energy * 0.3) + (warmth * 0.3) + (contrast * 0.2) + (complexity * 0.2);
  scores["Magical Realism"] = (organic * 0.3) + (warmth * 0.3) + (complexity * 0.4);
  scores["Tropicalia (Brazilian)"] = (energy * 0.4) + (warmth * 0.3) + (organic * 0.3);
  scores["Neo-concretismo (Brazilian)"] = (geometric * 0.3) + (energy * 0.3) + (contrast * 0.2) + ((1 - complexity) * 0.2);
  scores["Torres-Garcia Universalism"] = (geometric * 0.3) + (symmetry * 0.3) + (warmth * 0.2) + ((1 - energy) * 0.2);
  scores["Mola (Guna/Kuna Textile)"] = (contrast * 0.3) + (complexity * 0.3) + (warmth * 0.2) + (geometric * 0.2);

  return scores;
}

/**
 * Classify art movements using high-signal photos from Tizita
 *
 * Returns top 7 movements with affinities, plus metadata about signal sources
 */
function classifyMovements() {
  const bestPhotos = tizitaDirectService.getBestPhotos();
  const favPhotos = tizitaDirectService.getFavoritePhotos();
  const highRated = tizitaDirectService.getHighRatedPhotos(4);
  const lowRated = tizitaDirectService.getLowRatedPhotos(2);

  const totalSignalPhotos = bestPhotos.length + favPhotos.length + highRated.length;

  if (totalSignalPhotos === 0) {
    return null; // No high-signal photos, caller should fall back to heuristic
  }

  // Compute weighted centroid from all signal sources
  const centroid = computeWeightedCentroid([
    { photos: bestPhotos, weight: 3.0 },
    { photos: favPhotos, weight: 2.0 },
    { photos: highRated, weight: 1.5 },
    { photos: lowRated, weight: -1.0 },
  ]);

  if (!centroid) {
    return null;
  }

  // Extract characteristics from the high-signal centroid
  const chars = extractCharacteristics(centroid);

  // Score movements
  const scores = scoreMovements(chars);

  // Sort and get top 7
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, affinity]) => ({ name, affinity: Math.round(affinity * 100) / 100 }));

  return {
    movements: sorted,
    characteristics: chars,
    signal: {
      bestPhotos: bestPhotos.length,
      favorites: favPhotos.length,
      highRated: highRated.length,
      lowRated: lowRated.length,
      totalSignal: totalSignalPhotos,
    },
  };
}

module.exports = { classifyMovements };
