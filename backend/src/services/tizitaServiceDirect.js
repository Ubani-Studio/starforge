const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const visualDnaCache = require('./visualDnaCache');

const Tizita_API_URL = process.env.TIZITA_API_URL || process.env.Tizita_API_URL || 'http://localhost:8001/api/v1';

/**
 * Direct Tizita Database Connection
 * Queries SQLite database directly for faster access
 */
class TizitaDirectService {
  constructor() {
    this.dbPath = process.env.TIZITA_DB_PATH || process.env.Tizita_DB_PATH || '';
    this.storagePath = process.env.TIZITA_STORAGE || process.env.Tizita_STORAGE || '';
    this.db = null;
  }

  /**
   * Initialize database connection
   */
  connect() {
    if (!fs.existsSync(this.dbPath)) {
      console.warn('Tizita database not found at:', this.dbPath);
      return false;
    }

    try {
      this.db = new Database(this.dbPath, { readonly: true });
      console.log('✓ Connected to Tizita database');
      return true;
    } catch (error) {
      console.error('Failed to connect to Tizita:', error.message);
      return false;
    }
  }

  /**
   * Get user's profile and stats
   * Note: Tizita is single-user system, no user_id filtering on photos
   */
  getUserProfile(userId = 1) {
    if (!this.db) this.connect();
    if (!this.db) return null;

    try {
      // Get taste profile (may have user_id or be null)
      const profile = this.db.prepare(`
        SELECT * FROM taste_profiles
        ORDER BY updated_at DESC
        LIMIT 1
      `).get();

      // Get photo stats (no user_id in photos table)
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total_photos,
          AVG(clarosa_score) as avg_score,
          MAX(clarosa_score) as max_score,
          MIN(clarosa_score) as min_score,
          SUM(CASE WHEN clarosa_score >= 0.80 THEN 1 ELSE 0 END) as highlight_count,
          SUM(CASE WHEN clarosa_score >= 0.60 AND clarosa_score < 0.80 THEN 1 ELSE 0 END) as keep_count,
          SUM(CASE WHEN clarosa_score < 0.35 THEN 1 ELSE 0 END) as delete_count
        FROM photos
        WHERE deleted_at IS NULL
      `).get();

      // Get training stats (single user)
      const training = this.db.prepare(`
        SELECT
          COUNT(DISTINCT session_id) as training_sessions,
          COUNT(*) as total_comparisons,
          AVG(decision_time_ms) as avg_decision_time
        FROM training_comparisons
      `).get();

      return {
        profile: profile || {
          user_id: userId,
          confidence_score: 0,
          training_samples_count: 0,
          comparisons_count: 0
        },
        stats: stats || {},
        training: training || {}
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Get user's top-rated photos with full details
   * Note: clarosa_score is 0-1 scale (not 0-100)
   */
  getTopPhotos(userId = 1, limit = 20, minScore = 0.60) {
    if (!this.db) this.connect();
    if (!this.db) return [];

    try {
      // Convert minScore to 0-1 scale if provided as 0-100
      const normalizedMinScore = minScore > 1 ? minScore / 100 : minScore;

      const photos = this.db.prepare(`
        SELECT
          id,
          file_path,
          file_url,
          clarosa_score,
          global_score_0_100,
          personal_taste_score_0_100,
          stars_0_5,
          quality_score,
          aesthetic_score,
          tags,
          taken_at,
          uploaded_at,
          scored_at
        FROM photos
        WHERE deleted_at IS NULL
          AND clarosa_score IS NOT NULL
          AND clarosa_score >= ?
        ORDER BY clarosa_score DESC
        LIMIT ?
      `).all(normalizedMinScore, limit);

      return photos.map(photo => ({
        ...photo,
        // Convert 0-1 score to 0-100 for display
        clarosa_score: Math.round(photo.clarosa_score * 100),
        tags: photo.tags ? (typeof photo.tags === 'string' ? JSON.parse(photo.tags) : photo.tags) : [],
        fullPath: path.join(this.storagePath, 'photos', path.basename(photo.file_path || ''))
      }));
    } catch (error) {
      console.error('Error getting top photos:', error);
      return [];
    }
  }

  /**
   * Get photos grouped by curation category
   * Note: clarosa_score is 0-1 scale
   */
  getCurationCategories(userId = 1) {
    if (!this.db) this.connect();
    if (!this.db) return null;

    try {
      return {
        highlight: this.db.prepare(`
          SELECT * FROM photos
          WHERE deleted_at IS NULL AND clarosa_score >= 0.80
          ORDER BY clarosa_score DESC LIMIT 10
        `).all(),

        keep: this.db.prepare(`
          SELECT * FROM photos
          WHERE deleted_at IS NULL
            AND clarosa_score >= 0.60 AND clarosa_score < 0.80
          ORDER BY clarosa_score DESC LIMIT 20
        `).all(),

        review: this.db.prepare(`
          SELECT * FROM photos
          WHERE deleted_at IS NULL
            AND clarosa_score > 0.35 AND clarosa_score < 0.60
          ORDER BY clarosa_score DESC LIMIT 20
        `).all(),

        delete: this.db.prepare(`
          SELECT * FROM photos
          WHERE deleted_at IS NULL AND clarosa_score <= 0.35
          ORDER BY clarosa_score ASC LIMIT 10
        `).all()
      };
    } catch (error) {
      console.error('Error getting curation categories:', error);
      return null;
    }
  }

  /**
   * Extract visual DNA from user's photos
   * Sophisticated analysis with color extraction and marketing-grade descriptions
   * Uses intelligent caching to avoid reprocessing
   */
  async extractVisualDNA(userId = 1, forceRefresh = false) {
    if (!this.db) this.connect();
    if (!this.db) return null;

    try {
      // Get ALL photos for comprehensive analysis (using 0-1 scale)
      const allPhotos = this.getTopPhotos(userId, 500, 0.0);

      if (allPhotos.length === 0) {
        return {
          styleDescription: 'No photos analyzed yet',
          confidence: 0,
          photoCount: 0
        };
      }

      // Check cache first (unless force refresh)
      if (forceRefresh) {
        visualDnaCache.invalidateCache(userId);
        console.log('Force refresh: invalidated Visual DNA cache');
      } else {
        const cachedDNA = visualDnaCache.getCached(userId, allPhotos);
        if (cachedDNA) {
          console.log(`Using cached Visual DNA (${cachedDNA.cacheAge} minutes old)`);
          return cachedDNA;
        }
      }

      // Prepare photo data for Python analyzer
      const photosData = allPhotos.map(p => ({
        path: p.fullPath,
        score: p.clarosa_score,
        tags: p.tags || []
      }));

      // Write to temp file for Python script
      const tmpFile = `/tmp/tizita_photos_${Date.now()}.json`;
      fs.writeFileSync(tmpFile, JSON.stringify(photosData));

      // Run sophisticated Python analysis
      const { spawn } = require('child_process');
      const pythonScript = path.join(__dirname, '../python/visual_dna_analyzer.py');

      const result = await new Promise((resolve, reject) => {
        const python = spawn('python3', [pythonScript, tmpFile, '--json']);

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        python.on('close', (code) => {
          // Clean up temp file
          try { fs.unlinkSync(tmpFile); } catch (e) {}

          if (code !== 0) {
            console.error('Python visual DNA analysis failed:', stderr);
            // Fall back to simple description
            resolve({
              styleDescription: this.generateSimpleStyleDescription(allPhotos),
              colorPalette: [],
              confidence: 0.5
            });
          } else {
            try {
              const analysis = JSON.parse(stdout);
              resolve(analysis);
            } catch (error) {
              reject(new Error(`Failed to parse Python output: ${error.message}`));
            }
          }
        });
      });

      // Get profile confidence
      const profile = this.getUserProfile(userId);
      const confidence = profile?.profile?.confidence_score || result.confidence || 0;

      const visualDna = {
        ...result,
        confidence,
        photoCount: allPhotos.length
      };

      // Cache the results for future requests
      visualDnaCache.saveCache(userId, visualDna, allPhotos);

      return visualDna;
    } catch (error) {
      console.error('Error extracting visual DNA:', error);
      return null;
    }
  }

  /**
   * Generate simple style description (fallback)
   */
  generateSimpleStyleDescription(photos) {
    if (photos.length === 0) {
      return 'Aesthetic preferences still being learned';
    }

    // Extract tags
    const allTags = photos.flatMap(p => p.tags || []).filter(t => t);
    const tagFreq = {};
    allTags.forEach(tag => {
      tagFreq[tag] = (tagFreq[tag] || 0) + 1;
    });

    const topTags = Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);

    const avgScore = photos.reduce((sum, p) => sum + (p.clarosa_score || 0), 0) / photos.length;

    const qualityLevel = avgScore >= 85 ? 'refined' :
                        avgScore >= 70 ? 'curated' :
                        avgScore >= 50 ? 'evolving' : 'experimental';

    return `${qualityLevel} aesthetic with ${topTags.join(', ')} influences`;
  }

  /**
   * Get recent comparisons for activity tracking
   */
  getRecentActivity(userId = 1, limit = 10) {
    if (!this.db) this.connect();
    if (!this.db) return [];

    try {
      return this.db.prepare(`
        SELECT
          tc.*,
          pa.file_path as photo_a_path,
          pb.file_path as photo_b_path
        FROM training_comparisons tc
        LEFT JOIN photos pa ON tc.photo_a_id = pa.id
        LEFT JOIN photos pb ON tc.photo_b_id = pb.id
        WHERE tc.user_id = ?
        ORDER BY tc.created_at DESC
        LIMIT ?
      `).all(userId, limit);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Fetch deep analysis from Tizita HTTP API
   * Returns art movements, color profile, composition, visual era, influences
   */
  async fetchDeepAnalysis(userId = 1) {
    try {
      const response = await axios.get(`${Tizita_API_URL}/visual-dna/analysis`, {
        params: { user_id: userId },
        timeout: 10000,
      });

      // Return the full response including base_characteristics, confidence, deep_analysis
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch Tizita deep analysis:', error.message);
      return null;
    }
  }

  /**
   * Get photos marked as "best" (highest conviction signal, weight 3.0 in taste model)
   */
  getBestPhotos() {
    if (!this.db) this.connect();
    if (!this.db) return [];

    try {
      return this.db.prepare(`
        SELECT id, file_path, clarosa_score, user_rating, siglip_embedding
        FROM photos
        WHERE best_photo = 1 AND deleted_at IS NULL
      `).all();
    } catch (error) {
      console.error('Error getting best photos:', error.message);
      return [];
    }
  }

  /**
   * Get photos marked as favourites (weight 2.0 in taste model)
   */
  getFavoritePhotos() {
    if (!this.db) this.connect();
    if (!this.db) return [];

    try {
      return this.db.prepare(`
        SELECT id, file_path, clarosa_score, user_rating, siglip_embedding
        FROM photos
        WHERE favorite = 1 AND deleted_at IS NULL
      `).all();
    } catch (error) {
      console.error('Error getting favorite photos:', error.message);
      return [];
    }
  }

  /**
   * Get highly-rated photos (star rating >= minRating)
   */
  getHighRatedPhotos(minRating = 4) {
    if (!this.db) this.connect();
    if (!this.db) return [];

    try {
      return this.db.prepare(`
        SELECT id, file_path, clarosa_score, user_rating, siglip_embedding
        FROM photos
        WHERE user_rating >= ? AND deleted_at IS NULL
        ORDER BY user_rating DESC
      `).all(minRating);
    } catch (error) {
      console.error('Error getting high-rated photos:', error.message);
      return [];
    }
  }

  /**
   * Get low-rated photos (anti-signal for movement classification)
   */
  getLowRatedPhotos(maxRating = 2) {
    if (!this.db) this.connect();
    if (!this.db) return [];

    try {
      return this.db.prepare(`
        SELECT id, file_path, clarosa_score, user_rating, siglip_embedding
        FROM photos
        WHERE user_rating IS NOT NULL AND user_rating <= ? AND user_rating > 0 AND deleted_at IS NULL
        ORDER BY user_rating ASC
      `).all(maxRating);
    } catch (error) {
      console.error('Error getting low-rated photos:', error.message);
      return [];
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = new TizitaDirectService();
