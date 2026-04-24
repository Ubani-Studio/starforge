const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

// Services (loaded AFTER dotenv so env vars are available in constructors)
const tizitaService = require('./services/tizitaService');
const tizitaDirectService = require('./services/tizitaServiceDirect');
const sinkService = require('./services/sinkService');
const sinkFolderScanner = require('./services/sinkFolderScanner');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Tizita photos as static files
app.use('/storage', express.static(process.env.Tizita_STORAGE || path.join(__dirname, '../storage')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|mp3|wav|ics|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ori API is running' });
});

// Upload files
app.post('/api/upload', upload.array('files'), (req, res) => {
  try {
    const files = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    }));
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate Twin OS
app.post('/api/twin/generate', (req, res) => {
  try {
    const { audioFiles, visualFiles, caption, bio, glowLevel } = req.body;

    // Placeholder for AI generation logic
    const twinData = {
      voiceSample: `${caption?.slice(0, 50)}... [Voice sample generated]`,
      visualTone: 'Hyperpop neon dreamscape',
      capacityScore: glowLevel >= 4 ? 'high' : glowLevel >= 3 ? 'medium' : 'low',
      personality: {
        tone: 'poetic',
        style: 'mythic',
        energyLevel: glowLevel,
      },
    };

    res.json({ success: true, twinData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate Ritual Plan
app.post('/api/ritual/generate', (req, res) => {
  try {
    const { trackName, dropDate, ritualMode, twinData, glowLevel } = req.body;

    const dropDateObj = new Date(dropDate);

    const phases = ritualMode === 'full'
      ? [
          { name: 'tease', offset: -14, assets: ['Snippet video', 'Cryptic caption', 'Story teaser'] },
          { name: 'announce', offset: -7, assets: ['Cover reveal', 'Full caption', 'Pre-save link'] },
          { name: 'drop', offset: 0, assets: ['Full track', 'Music video', 'Press kit'] },
          { name: 'follow-up', offset: 3, assets: ['BTS content', 'Remix stems', 'Thank you post'] },
        ]
      : [
          { name: 'announce', offset: -3, assets: ['Cover reveal', 'Simple caption'] },
          { name: 'drop', offset: 0, assets: ['Full track', 'Short video'] },
        ];

    const timeline = phases.map(phase => ({
      ...phase,
      date: new Date(dropDateObj.getTime() + phase.offset * 24 * 60 * 60 * 1000),
      copy: `Auto-generated copy for ${phase.name} phase`,
    }));

    const ritualPlan = {
      trackName,
      dropDate,
      mode: ritualMode,
      timeline,
      capacity: glowLevel >= 3 ? 'sufficient' : 'compressed',
    };

    res.json({ success: true, ritualPlan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Parse calendar files (.ics or .csv)
app.post('/api/calendar/parse', upload.single('calendar'), (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Placeholder for calendar parsing logic
    const events = [
      { date: '2026-02-15', title: 'Studio session', type: 'work' },
      { date: '2026-02-20', title: 'Show', type: 'performance' },
    ];

    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// Tizita Visual Integration Routes
// ========================================

// Get visual essence from Tizita
app.get('/api/tizita/visual-essence', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const minScore = parseFloat(req.query.min_score) || 0.7;

    // Get top-rated images from Tizita
    const images = await tizitaService.getTopRatedImages(limit, minScore);

    // Extract visual tone from images
    const visualTone = await tizitaService.extractVisualTone(images);

    res.json({
      success: true,
      images,
      visualTone,
      source: 'tizita'
    });
  } catch (error) {
    console.error('Error fetching Tizita data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Tizita taste profile
app.get('/api/tizita/taste-profile', async (req, res) => {
  try {
    const profile = await tizitaService.getVisualTasteProfile();

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Import Midjourney images to Tizita
app.post('/api/tizita/import-midjourney', async (req, res) => {
  try {
    const { mjExportPath } = req.body;

    if (!mjExportPath) {
      return res.status(400).json({
        success: false,
        error: 'mjExportPath is required'
      });
    }

    const result = await tizitaService.importFromMidjourney(mjExportPath);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// SINK Audio Integration Routes
// ========================================

// Analyze single audio file
app.post('/api/sink/analyze', upload.single('audio'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file uploaded'
      });
    }

    // Analyze with SINK
    const analysis = await sinkService.analyzeMood(file.path);

    res.json({
      success: true,
      analysis,
      filename: file.originalname
    });
  } catch (error) {
    console.error('Error analyzing audio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Analyze multiple audio files
app.post('/api/sink/analyze-batch', upload.array('audio'), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No audio files uploaded'
      });
    }

    // Analyze all files
    const filePaths = files.map(f => f.path);
    const analyses = await sinkService.analyzeBatch(filePaths);

    // Generate overall audio DNA profile
    const audioDNA = await sinkService.generateAudioDNA(analyses);

    res.json({
      success: true,
      analyses: files.map((file, idx) => ({
        filename: file.originalname,
        analysis: analyses[idx]
      })),
      audioDNA
    });
  } catch (error) {
    console.error('Error in batch analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Separate audio into stems
app.post('/api/sink/separate-stems', upload.single('audio'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file uploaded'
      });
    }

    const result = await sinkService.separateStems(file.path);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// Enhanced Twin Generation with Tizita + SINK
// ========================================

app.post('/api/twin/generate-enhanced', upload.array('audio'), async (req, res) => {
  try {
    const { caption, bio, glowLevel } = req.body;
    const audioFiles = req.files || [];

    console.log('Generating enhanced Twin with Tizita + SINK integration');

    // 1. Get visual essence from Tizita
    let visualData = null;
    try {
      const images = await tizitaService.getTopRatedImages(10, 0.7);
      visualData = await tizitaService.extractVisualTone(images);
    } catch (error) {
      console.log('Tizita unavailable, using fallback');
      visualData = {
        styleDescription: 'Cosmic neon aesthetic',
        dominantColors: ['#A882FF', '#26FFE6'],
        confidence: 0.5
      };
    }

    // 2. Analyze audio files with SINK
    let audioData = null;
    if (audioFiles.length > 0) {
      try {
        const filePaths = audioFiles.map(f => f.path);
        const analyses = await sinkService.analyzeBatch(filePaths);
        audioData = await sinkService.generateAudioDNA(analyses);
      } catch (error) {
        console.log('SINK unavailable, using fallback');
        audioData = {
          profile: 'High-energy electronic with driving beats',
          confidence: 0.5
        };
      }
    }

    // 3. Generate Twin profile
    const twinData = {
      // Voice
      voiceSample: caption ? `${caption.slice(0, 50)}...` : 'Voice sample pending',
      bio: bio || '',

      // Visual DNA from Tizita
      visualTone: visualData.styleDescription,
      colorPalette: visualData.dominantColors,
      aestheticTags: visualData.aestheticTags,
      visualConfidence: visualData.confidence,

      // Audio DNA from SINK
      audioProfile: audioData?.profile || 'No audio analysis available',
      audioFeatures: audioData?.features || null,
      audioConfidence: audioData?.confidence || 0,

      // Capacity
      capacityScore: glowLevel >= 4 ? 'high' : glowLevel >= 3 ? 'medium' : 'low',

      // Overall
      personality: {
        tone: 'poetic',
        style: 'mythic',
        energyLevel: glowLevel,
      },

      // Metadata
      generatedAt: new Date().toISOString(),
      sources: {
        visual: visualData ? 'tizita' : 'fallback',
        audio: audioData ? 'sink' : 'fallback'
      }
    };

    res.json({
      success: true,
      twinData
    });
  } catch (error) {
    console.error('Error generating enhanced Twin:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// DEEP INTEGRATION ROUTES
// ========================================
const deepIntegrationRoutes = require('./routes/deepIntegration');
app.use('/api/deep', deepIntegrationRoutes);

// ========================================
// ENHANCED AUDIO ANALYSIS ROUTES
// ========================================
const audioEnhancedRoutes = require('./routes/audioEnhanced');
app.use('/api/audio', audioEnhancedRoutes);

// ========================================
// BATCH AUDIO ANALYSIS (Parallel + Progress)
// ========================================
const audioBatchRoutes = require('./routes/audioBatch');
app.use('/api/audio', audioBatchRoutes);

// ========================================
// SUBSCRIPTION ROUTES (PRO TIER)
// ========================================
const subscriptionRoutes = require('./routes/subscription');
app.use('/api/subscription', subscriptionRoutes);

// ========================================
// LIBRARY & CATALOG ANALYSIS ROUTES
// ========================================
const libraryRoutes = require('./routes/library');
app.use('/api/library', libraryRoutes);

// ========================================
// AI GENERATION ROUTES (PERSONAL AI TWIN)
// ========================================
const aiGenerationRoutes = require('./routes/aiGeneration');
app.use('/api/ai', aiGenerationRoutes);

// ========================================
// WRITING SAMPLES (VOICE DNA TRAINING)
// ========================================
const writingSamplesRoutes = require('./routes/writingSamples');
app.use('/api/writing-samples', writingSamplesRoutes);

// ========================================
// LORA TRAINING (SONIC IDENTITY MODELS)
// ========================================
const loraTrainingRoutes = require('./routes/loraTraining');
app.use('/api/lora', loraTrainingRoutes);

// ========================================
// PROJECT DNA (CORE IDENTITY SCANNER)
// ========================================
const projectDnaRoutes = require('./routes/projectDna');
app.use('/api/project-dna', projectDnaRoutes);

// ========================================
// SUBTASTE INTEGRATION (QUIZ + AUTO-CLASSIFY)
// ========================================
const subtasteIntegrationRoutes = require('./routes/subtasteIntegration');
app.use('/api/subtaste', subtasteIntegrationRoutes);

// ========================================
// TWIN OS VISUAL DNA (Tizita INTEGRATION)
// ========================================
const twinVisualDnaRoutes = require('./routes/twinVisualDna');
app.use('/api/twin/visual-dna', twinVisualDnaRoutes);

// ========================================
// EXPANSION ENGINE (LINEAGE DISCOVERY)
// ========================================
const expansionRoutes = require('./routes/expansion');
app.use('/api/expansion', expansionRoutes);

// ========================================
// COLOR RATINGS
// ========================================
const colorRatingRoutes = require('./routes/colorRatings');
app.use('/api/color-ratings', colorRatingRoutes);

// ========================================
// COLOR CANON (PERSISTENT IDENTITY)
// ========================================
const colorCanonRoutes = require('./routes/colorCanon');
app.use('/api/color-canon', colorCanonRoutes);

// ========================================
// WRITING DNA (IBIS INTEGRATION)
// ========================================
const writingDnaRoutes = require('./routes/writingDna');
app.use('/api/writing-dna', writingDnaRoutes);

// ========================================
// IDENTITY (NARRATIVE + DRIFT + SNAPSHOTS)
// ========================================
const identityRoutes = require('./routes/identity');
app.use('/api/identity', identityRoutes);

// ========================================
// RELATIONAL INTELLIGENCE (DUO/TEAM)
// ========================================
const relationalRoutes = require('./routes/relational');
app.use('/api/relational', relationalRoutes);

// ========================================
// ROUNDS (RESONANCE SIGNAL)
// Pipeline prompt §15 — the ecosystem API Qualn, Slayt, and Ibis
// all consult when surfacing "moments that resonate right now".
// Downstream apps POST /api/rounds/score with anchors + resonance;
// they then GET /api/rounds/:userId?project=X to rank.
// ========================================
const roundsRoutes = require('./routes/rounds');
app.use('/api/rounds', roundsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🐙 Ori API running on port ${PORT}`);
});
