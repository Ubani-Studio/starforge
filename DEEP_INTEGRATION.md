# 🔥 Starforge Deep Integration Guide

## What's New: Real TIZITA + SINK Integration

The previous integration was **surface-level** (API calls with fallbacks). This is **deep integration** with:

✅ **Direct TIZITA database access** - See your actual photos and Bradley-Terry scores
✅ **Folder scanning** - Analyze entire music catalog (1000+ tracks)
✅ **Pattern recognition** - Learn your musical DNA across all tracks
✅ **Music generation ready** - Architecture for AudioCraft/Magenta integration

---

## 🎨 TIZITA Deep Integration

### What You Get Now

**Before (Surface):**
- Generic API calls
- Fallback if TIZITA not running
- No real data shown

**After (Deep):**
- Direct SQLite database queries
- Your actual photos with scores
- Real Bradley-Terry confidence
- Visual DNA from your curated collection

### New API Endpoints

#### 1. Get Your Real Profile

```bash
GET /api/deep/tizita/profile?user_id=1
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "profile": {
      "user_id": 1,
      "confidence_score": 0.85,
      "training_samples_count": 120,
      "comparisons_count": 45,
      "pref_vibrant_colors": 0.72,
      "pref_high_contrast": 0.65,
      ...
    },
    "stats": {
      "total_photos": 1523,
      "avg_score": 67.3,
      "highlight_count": 203,
      "keep_count": 892,
      "delete_count": 127
    },
    "training": {
      "training_sessions": 12,
      "total_comparisons": 45,
      "avg_decision_time": 2300
    }
  }
}
```

#### 2. Get Your Top-Rated Photos

```bash
GET /api/deep/tizita/top-photos?user_id=1&limit=20&min_score=70
```

**Response:**
```json
{
  "success": true,
  "photos": [
    {
      "id": 1,
      "file_path": "/storage/photos/abc123.jpg",
      "tizita_score": 89.5,
      "global_score_0_100": 75,
      "personal_taste_score_0_100": 92,
      "stars_0_5": 4.5,
      "tags": ["portrait", "natural-light", "minimalist"],
      "taken_at": "2025-12-15T10:30:00Z"
    }
  ],
  "count": 20
}
```

#### 3. Extract Complete Visual DNA

```bash
GET /api/deep/tizita/visual-dna?user_id=1
```

**Response:**
```json
{
  "success": true,
  "visualDNA": {
    "styleDescription": "refined high-quality aesthetic with portrait, natural-light, minimalist influences",
    "topTags": ["portrait", "natural-light", "minimalist", "warm-tones", "candid"],
    "avgScores": {
      "tizita": 73.2,
      "quality": 81.5,
      "aesthetic": 76.8
    },
    "confidence": 0.85,
    "photoCount": 203,
    "topPhotos": [/* top 10 photos */]
  }
}
```

#### 4. Get Curation Categories

```bash
GET /api/deep/tizita/curation?user_id=1
```

**Response:**
```json
{
  "success": true,
  "categories": {
    "highlight": [/* 10 best photos, score >= 80 */],
    "keep": [/* 20 photos, score 60-80 */],
    "review": [/* 20 photos, score 35-60 */],
    "delete": [/* 10 worst photos, score <= 35 */]
  }
}
```

---

## 🎵 SINK Deep Integration

### What You Get Now

**Before (Surface):**
- Single file upload
- Basic mood analysis
- No pattern recognition

**After (Deep):**
- **Scan entire folders** (recursive, 1000+ files)
- **Batch analysis** with progress tracking
- **Pattern recognition** across your catalog
- **Style clustering** (identifies your musical DNA)
- **Music generation ready** (architecture in place)

### New API Endpoints

#### 1. Scan Music Folder

```bash
POST /api/deep/sink/scan-folder
Content-Type: application/json

{
  "folderPath": "/home/sphinxy/Music",
  "maxDepth": 10,
  "maxFiles": 1000,
  "skipHidden": true
}
```

**Response:**
```json
{
  "success": true,
  "files": [
    "/home/sphinxy/Music/Album1/track1.mp3",
    "/home/sphinxy/Music/Album1/track2.mp3",
    ...
  ],
  "count": 523
}
```

#### 2. Analyze Entire Catalog

```bash
POST /api/deep/sink/analyze-catalog
Content-Type: application/json

{
  "folderPath": "/home/sphinxy/Music",
  "batchSize": 10,
  "parallel": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Catalog analysis started",
  "filesQueued": 523
}
```

**This runs asynchronously!** Check status with:

```bash
GET /api/deep/sink/analysis-status
```

#### 3. Get Analysis Status

```bash
GET /api/deep/sink/analysis-status
```

**Response:**
```json
{
  "success": true,
  "isScanning": true,
  "totalAnalyzed": 120,
  "results": [
    {
      "file": "/home/sphinxy/Music/track1.mp3",
      "fileName": "track1.mp3",
      "energy": 0.78,
      "valence": 0.55,
      "arousal": 0.72,
      "bpm": 128,
      "key": "A minor",
      "mood_tags": ["energetic", "dark", "driving"],
      "analyzedAt": "2026-02-04T20:15:00Z"
    }
  ]
}
```

#### 4. Get Deep Pattern Analysis

```bash
GET /api/deep/sink/pattern-analysis
```

**Response:**
```json
{
  "success": true,
  "patterns": {
    "energyDistribution": {
      "low": 0.15,
      "medium": 0.35,
      "high": 0.50
    },
    "avgEnergy": 0.68,
    "avgValence": 0.52,
    "avgBPM": 125,
    "bpmRange": { "min": 80, "max": 160 },

    "bpmDistribution": {
      "slow": 12,
      "moderate": 45,
      "fast": 380,
      "veryFast": 86
    },

    "keyDistribution": [
      { "key": "A minor", "count": 58 },
      { "key": "C Major", "count": 42 },
      { "key": "D minor", "count": 38 }
    ],

    "moodTagFrequency": [
      { "mood": "energetic", "count": 325, "percentage": 0.62 },
      { "mood": "dark", "count": 280, "percentage": 0.54 },
      { "mood": "driving", "count": 250, "percentage": 0.48 }
    ],

    "styleClusters": [
      {
        "name": "highEnergy",
        "count": 280,
        "percentage": 0.54,
        "avgFeatures": {
          "energy": 0.85,
          "valence": 0.58,
          "bpm": 132
        }
      },
      {
        "name": "chill",
        "count": 65,
        "percentage": 0.12,
        "avgFeatures": {
          "energy": 0.25,
          "valence": 0.65,
          "bpm": 90
        }
      }
    ],

    "overallStyle": "high-energy dark music with fast-paced rhythms around 125 BPM"
  }
}
```

#### 5. Generate Complete Twin Profile

```bash
POST /api/deep/twin/generate-complete
Content-Type: application/json

{
  "userId": 1,
  "catalogPath": "/home/sphinxy/Music"
}
```

**Response:**
```json
{
  "success": true,
  "twinProfile": {
    "visual": {
      "styleDescription": "refined high-quality aesthetic with portrait influences",
      "topTags": ["portrait", "natural-light", "minimalist"],
      "confidence": 0.85,
      "photoCount": 203,
      "avgScores": {
        "tizita": 73.2,
        "quality": 81.5
      },
      "topPhotos": [/* 10 photos */]
    },

    "audio": {
      "totalTracks": 523,
      "patterns": {
        "overallStyle": "high-energy dark music with fast-paced rhythms around 125 BPM",
        "avgEnergy": 0.68,
        "avgBPM": 125,
        "dominantMoods": ["energetic", "dark", "driving"],
        "styleClusters": [/* clusters */]
      }
    },

    "metadata": {
      "userId": 1,
      "trainingComparisons": 45,
      "confidenceScore": 0.85,
      "generatedAt": "2026-02-04T20:30:00Z"
    }
  }
}
```

---

## 🚀 How to Use

### Step 1: Test TIZITA Connection

```bash
# Check if TIZITA database exists
ls -la /home/sphinxy/tizita/backend/tizita.db

# Test profile endpoint
curl http://localhost:5000/api/deep/tizita/profile?user_id=1 | jq
```

**Expected:** Your actual TIZITA profile data

### Step 2: Test Visual DNA Extraction

```bash
curl http://localhost:5000/api/deep/tizita/visual-dna?user_id=1 | jq
```

**Expected:** Your top photos, tags, and style description

### Step 3: Scan Your Music Folder

```bash
curl -X POST http://localhost:5000/api/deep/sink/scan-folder \
  -H "Content-Type: application/json" \
  -d '{
    "folderPath": "/home/sphinxy/Music",
    "maxFiles": 100
  }' | jq
```

**Expected:** List of all audio files found

### Step 4: Analyze Catalog

```bash
curl -X POST http://localhost:5000/api/deep/sink/analyze-catalog \
  -H "Content-Type: application/json" \
  -d '{
    "folderPath": "/home/sphinxy/Music",
    "batchSize": 5,
    "parallel": 2
  }' | jq
```

**Expected:** Analysis started message

### Step 5: Check Analysis Progress

```bash
# Keep checking until isScanning: false
curl http://localhost:5000/api/deep/sink/analysis-status | jq
```

### Step 6: Get Pattern Analysis

```bash
curl http://localhost:5000/api/deep/sink/pattern-analysis | jq
```

**Expected:** Deep insights into your musical style

### Step 7: Generate Complete Twin

```bash
curl -X POST http://localhost:5000/api/deep/twin/generate-complete \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "catalogPath": "/home/sphinxy/Music"
  }' | jq
```

**Expected:** Complete Twin profile with visual + audio DNA

---

## 🔧 Configuration

Add to `backend/.env`:

```bash
# TIZITA Direct Access
TIZITA_DB_PATH=/home/sphinxy/tizita/backend/tizita.db
TIZITA_STORAGE=/home/sphinxy/tizita/backend/storage

# SINK Integration
SINK_PATH=/home/sphinxy/SINK
PYTHON_PATH=python3
```

---

## 📊 What This Enables

### For Twin Genesis

**Old way:**
```
User uploads files → Basic analysis → Generic Twin
```

**New way:**
```
User connects TIZITA → Pulls 1000+ photos → Extracts visual DNA → Real taste profile
User scans ~/Music → Analyzes 500+ tracks → Pattern recognition → Musical DNA
Twin = Visual DNA + Musical DNA + Confidence scores
```

### For Music Generation (Future)

With your catalog analyzed, you can:

```python
# Generate new track based on your style
POST /api/deep/sink/generate-music
{
  "style": "high-energy dark techno",
  "basedOnTracks": [/* top 10 tracks from pattern analysis */],
  "duration": 180
}

# Will integrate:
- AudioCraft (Meta) for generative music
- Style transfer from your catalog
- Mood matching to your aesthetic
```

---

## 🎯 Next Steps

1. **Test the endpoints** using curl commands above
2. **Frontend integration** - Build UI for:
   - Displaying TIZITA photos in gallery
   - Showing visual DNA stats
   - Folder browser for SINK
   - Real-time analysis progress
   - Pattern visualization
3. **Music generation** - Integrate AudioCraft/Magenta
4. **Real-time updates** - WebSockets for scan progress

---

## 🔥 Key Differences

| Feature | Surface Integration | Deep Integration |
|---------|---------------------|------------------|
| **TIZITA** | API calls with fallback | Direct database queries |
| **Photo Display** | Generic colors | Your actual photos |
| **Confidence** | Made up | Real Bradley-Terry scores |
| **SINK Analysis** | Single files | Entire folders (1000+) |
| **Pattern Recognition** | None | Full catalog analysis |
| **Music Generation** | Not possible | Architecture ready |
| **Speed** | Slow (HTTP) | Fast (direct DB) |
| **Reliability** | Depends on API | Always works if DB exists |

---

**This is the real integration. Your actual data. Your actual style. Ready to forge.** 🌌
