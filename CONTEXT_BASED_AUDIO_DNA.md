# Context-Based Audio DNA System

## Overview

The Audio DNA system now supports **context-aware analysis** that separates your musical identity into distinct contexts:

- **DJ Collection** (`dj_collection`) - Your curatorial taste (tracks you play/mix)
- **My Music** (`my_music`) - Your creative output (tracks you produce)
- **Combined** - Full aesthetic profile across all tracks
- **Compare** - Cross-context analysis (UNIQUE FEATURE)

This creates a sophisticated, multi-dimensional understanding of your musical identity as both curator and creator.

---

## Why Context Matters

### The Multi-Hyphenate Creator Problem

Many creative professionals wear multiple hats:
- DJs who also produce
- Producers who also DJ
- Musicians who curate playlists

Traditional music analysis treats all tracks the same, but these contexts have **different meanings**:

- **Rekordbox tracks** → What you play for others (curatorial taste)
- **Uploaded tracks** → What you create yourself (artistic output)

These two contexts can be:
- **Highly aligned** (you DJ what you make)
- **Divergent** (you explore different sonic territories)
- **Complementary** (you experiment in production, curate consistently in DJ sets)

Understanding the relationship between these contexts reveals deep insights about your creative identity.

---

## Database Schema

### Musical Context Column

```sql
ALTER TABLE audio_tracks ADD COLUMN musical_context TEXT DEFAULT 'unknown';

-- Automatic tagging:
-- 'dj_collection' = Rekordbox imports
-- 'my_music' = File uploads
-- 'personal_library' = Future: Spotify/streaming imports
-- 'unknown' = Legacy tracks
```

### Migration

Run the migration script to add context to your existing database:

```bash
cd backend
node src/database/migrate_add_musical_context.js
```

This automatically tags existing tracks based on their source:
- Rekordbox imports → `dj_collection`
- Uploads → `my_music`

---

## API Endpoints

### 1. Context-Aware Sonic Palette

```http
GET /api/deep/audio/sonic-palette?context={context}
```

**Parameters:**
- `context` (optional): `dj_collection`, `my_music`, or `combined` (default: `combined`)
- `user_id` (optional): User ID (default: 1)
- `refresh` (optional): Force cache refresh (default: false)

**Response:**
```json
{
  "success": true,
  "context": "dj_collection",
  "trackCount": 90,
  "sonicPalette": {
    "sonicPalette": [
      {
        "band": "bass",
        "bandLabel": "Bass (60-250Hz)",
        "prominence": 0.85,
        "energyDb": -8.2
      },
      // ... more frequency bands
    ],
    "tonalCharacteristics": "warm energetic bass-heavy sonic aesthetic",
    "dominantFrequencies": [...],
    "confidence": 0.92
  }
}
```

**Examples:**
```bash
# Analyze DJ collection only
curl "http://localhost:5000/api/deep/audio/sonic-palette?context=dj_collection"

# Analyze personal productions only
curl "http://localhost:5000/api/deep/audio/sonic-palette?context=my_music"

# Analyze everything together
curl "http://localhost:5000/api/deep/audio/sonic-palette?context=combined"
```

---

### 2. Context-Aware Taste Coherence

```http
GET /api/deep/audio/taste-coherence?context={context}
```

**Parameters:**
- `context` (optional): `dj_collection`, `my_music`, or `combined` (default: `combined`)

**Response:**
```json
{
  "success": true,
  "context": "dj_collection",
  "trackCount": 90,
  "coherence": {
    "overall": 0.54,
    "bpmConsistency": 0.68,
    "energyConsistency": 0.72,
    "genreCoherence": 0.45,
    "keyCoherence": 0.38,
    "moodCoherence": 0.67
  }
}
```

**Interpretation:**
- **High coherence (70%+)**: Very consistent taste/style in this context
- **Medium coherence (40-70%)**: Explores variety while maintaining identity
- **Low coherence (<40%)**: Very diverse, experimental approach

**Example:**
```bash
# Check if your DJ taste is more coherent than your productions
curl "http://localhost:5000/api/deep/audio/taste-coherence?context=dj_collection"
curl "http://localhost:5000/api/deep/audio/taste-coherence?context=my_music"
```

---

### 3. Context Comparison (UNIQUE FEATURE)

```http
GET /api/deep/audio/context-comparison
```

**Response:**
```json
{
  "success": true,
  "comparison": {
    "available": true,
    "overall": 73,
    "sonicAlignment": 82,
    "bpmOverlap": 68,
    "energyAlignment": 75,
    "keyAlignment": 67,
    "djContext": {
      "trackCount": 90,
      "coherence": { "overall": 0.54 },
      "sonicPalette": { ... }
    },
    "myMusicContext": {
      "trackCount": 12,
      "coherence": { "overall": 0.62 },
      "sonicPalette": { ... }
    },
    "insights": [
      "Your DJ taste and production style are highly aligned - you play what you make.",
      "You DJ 8 BPM faster than you produce (133 vs 125).",
      "Your productions are more cohesive than your DJ sets - you explore more variety in curation."
    ]
  }
}
```

**Requires:**
- At least 1 track in `dj_collection` (Rekordbox import)
- At least 1 track in `my_music` (file upload)

**Insights Generated:**
- Overall alignment assessment
- BPM differences
- Energy alignment
- Coherence comparison
- Creative identity patterns

**Example:**
```bash
curl "http://localhost:5000/api/deep/audio/context-comparison" | jq '.comparison.insights'
```

---

## Frontend Integration

### AudioDNAPanel Context Selector

The `AudioDNAPanel` component now includes a context selector with 4 modes:

```jsx
<AudioDNAPanel
  audioData={audioData}
  rekordboxData={rekordboxData}
  tizitaData={tizitaData}
/>
```

**User Interface:**

```
┌─────────────────────────────────────────────────┐
│ Audio DNA                                       │
├─────────────────────────────────────────────────┤
│ [DJ Taste] [My Music] [Combined] [Compare]      │
│                                                 │
│ Your curatorial taste - tracks you play/mix    │
│                                                 │
│ {Context-specific analysis displays here}      │
└─────────────────────────────────────────────────┘
```

**Modes:**

1. **DJ Taste** - Shows sonic palette, taste coherence for Rekordbox tracks
2. **My Music** - Shows sonic palette, taste coherence for uploaded tracks
3. **Combined** - Shows unified analysis across all tracks
4. **Compare** - Shows context comparison with insights

---

## Use Cases

### Use Case 1: DJ + Producer
**Scenario:** You DJ house music but produce techno

**Analysis:**
```bash
# Check DJ collection
curl ".../sonic-palette?context=dj_collection"
# Result: House sonic signature (120-128 BPM, warm bass)

# Check productions
curl ".../sonic-palette?context=my_music"
# Result: Techno sonic signature (128-135 BPM, metallic hi-hats)

# Compare contexts
curl ".../context-comparison"
# Result: 45% alignment - you explore different sonic territories
```

**Insight:** You maintain separate creative and curatorial identities.

---

### Use Case 2: DJ Who Plays Own Music
**Scenario:** You primarily DJ your own productions

**Analysis:**
```bash
curl ".../context-comparison"
# Result: 85% alignment - you DJ what you make
```

**Insight:** Strong aesthetic coherence across curator and creator roles.

---

### Use Case 3: Experimental Producer, Conservative DJ
**Scenario:** You DJ crowd-pleasers but produce avant-garde

**Analysis:**
```bash
# DJ taste coherence
curl ".../taste-coherence?context=dj_collection"
# Result: 78% coherent (consistent curatorial taste)

# Production coherence
curl ".../taste-coherence?context=my_music"
# Result: 42% coherent (experimental, diverse output)

# Compare
curl ".../context-comparison"
# Insight: "Your DJ taste is more consistent than your productions -
#          you experiment more in the studio."
```

---

## Caching Strategy

### Context-Specific Cache Keys

Each context maintains separate cache entries:

```javascript
// Cache keys
userId_dj_collection → Sonic palette for DJ collection
userId_my_music      → Sonic palette for My Music
userId               → Sonic palette for combined view
```

**Benefits:**
- Switching contexts is instant (cached)
- Uploading new tracks only invalidates relevant cache
- Independent refresh for each context

---

## Marketing Position

### Unique Differentiator

**"Multi-dimensional taste analysis for multi-hyphenate creators"**

This feature is **unique in the market**:
- Spotify/Apple Music: Single-context analysis
- Rekordbox: No cross-context comparison
- Competitors: Don't separate curatorial vs creative identity

### Target Audience

**Elite multi-hyphenate creators:**
- DJ/Producers
- Producer/Curators
- Multi-genre artists
- Creative directors
- Tastemakers with multiple creative outlets

### Value Proposition

"Understand the relationship between what you create and what you curate. Are you exploring different sonic territories or maintaining aesthetic coherence? Starforge reveals your complete creative identity across all contexts."

---

## Testing the System

### 1. Current State (DJ Collection Only)

```bash
# You have 90 Rekordbox tracks
curl "localhost:5000/api/deep/audio/sonic-palette?context=dj_collection"
# ✅ Works - shows DJ taste

curl "localhost:5000/api/deep/audio/sonic-palette?context=my_music"
# ❌ 404 - "No personal music tracks. Upload your productions to analyze."

curl "localhost:5000/api/deep/audio/context-comparison"
# ❌ 404 - "No personal music tracks yet. Upload your productions to analyze."
```

### 2. After Uploading Personal Music

```bash
# Upload your productions via AudioAnalysisCompact → Upload Files tab
# Then test:

curl "localhost:5000/api/deep/audio/sonic-palette?context=my_music"
# ✅ Shows your production style

curl "localhost:5000/api/deep/audio/context-comparison"
# ✅ Shows alignment between DJ taste vs production style
```

### 3. Frontend Testing

1. Open `http://localhost:3050`
2. Go to Twin Genesis Panel → Audio Analysis
3. Click through context tabs:
   - **DJ Taste** - Shows your Rekordbox collection analysis
   - **My Music** - Prompts you to upload (or shows if uploaded)
   - **Combined** - Shows everything together
   - **Compare** - Shows comparison (once you have both contexts)

---

## Implementation Files

### Backend

- `backend/src/database/migrate_add_musical_context.js` - Database migration
- `backend/src/services/contextComparisonService.js` - Context comparison logic
- `backend/src/routes/audioEnhanced.js` - Sets context on upload/import
- `backend/src/routes/deepIntegration.js` - Context-aware API endpoints
- `backend/src/services/sonicPaletteService.js` - Unchanged (receives pre-filtered tracks)
- `backend/src/services/sinkEnhanced.js` - Unchanged (coherence calculation)

### Frontend

- `frontend/src/components/AudioDNAPanel.js` - Context selector UI and API calls

### Database

- `audio_tracks.musical_context` - New column storing context

---

## Future Enhancements

### Additional Contexts

```sql
-- Planned contexts:
'spotify_library'     -- Personal listening (Spotify import)
'soundcloud_uploads'  -- SoundCloud uploads
'bandcamp_releases'   -- Bandcamp releases
'live_recordings'     -- Live set recordings
'collaborations'      -- Collaborative tracks
```

### Context-Specific Features

- **Context Timeline**: How your DJ taste vs production style evolved over time
- **Context Influence**: Does your DJ taste influence your productions? Vice versa?
- **Context Gaps**: What's in your DJ collection but not in your productions?
- **Context Recommendations**: "Your DJ taste suggests you'd enjoy producing..."

---

## Technical Notes

### SQL Queries

```sql
-- Get DJ collection tracks
SELECT * FROM audio_tracks WHERE musical_context = 'dj_collection';

-- Get personal music tracks
SELECT * FROM audio_tracks WHERE musical_context = 'my_music';

-- Get all tracks
SELECT * FROM audio_tracks WHERE musical_context IN ('dj_collection', 'my_music');

-- Context distribution
SELECT musical_context, COUNT(*) as count
FROM audio_tracks
GROUP BY musical_context;
```

### Performance

- Context filtering is fast (indexed column recommended for large catalogs)
- Separate caching ensures switching contexts is instant
- Python analysis runs only when cache is invalid

---

## Support

For issues or questions:
- Check server logs: `tmux attach -t starforge-backend`
- Verify migration ran: `SELECT musical_context, COUNT(*) FROM audio_tracks GROUP BY musical_context;`
- Test API endpoints directly with curl examples above

---

**Marketing tagline:** "The aesthetic coherence engine for creative tastemakers - now with multi-dimensional identity analysis."
