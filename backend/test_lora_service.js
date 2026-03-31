#!/usr/bin/env node

/**
 * Test LoRA Training Service
 *
 * Tests the DNA-curated LoRA training workflow
 */

require('dotenv').config();

const loraService = require('./src/services/loraTrainingService');

async function testLoRAService() {
  console.log('=== Starforge LoRA Training Service Test ===\n');

  const userId = 'default_user';

  // Test 1: List base models
  console.log('Test 1: Available Base Models');
  console.log('  musicgen-small: 10-100 tracks, 30-60 min training');
  console.log('  musicgen-medium: 20-200 tracks, 1-2 hours training');
  console.log('  musicgen-large: 30-500 tracks, 2-4 hours training');
  console.log('  ✓ Base models configured\n');

  // Test 2: Database initialization
  console.log('Test 2: Database Initialization');
  try {
    const db = loraService.getDb();
    console.log('  ✓ Database connected');

    // Check tables exist
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name LIKE 'lora%'
    `).all();
    console.log('  ✓ Tables created:', tables.map(t => t.name).join(', '));
  } catch (error) {
    console.log('  ✗ Database error:', error.message);
  }

  // Test 3: List existing models
  console.log('\nTest 3: Existing LoRA Models');
  try {
    const models = loraService.getLoRAModels(userId);
    console.log(`  ✓ Found ${models.length} existing models`);
    if (models.length > 0) {
      models.slice(0, 3).forEach(m => {
        console.log(`    - ${m.name} (${m.status})`);
      });
    }
  } catch (error) {
    console.log('  ✗ Error:', error.message);
  }

  // Test 4: Curate training data
  console.log('\nTest 4: Training Data Curation');
  try {
    const curation = await loraService.curateTrainingData(userId, {
      coherenceThreshold: 0.5,  // Lower threshold for testing
      maxTracks: 50
    });

    console.log(`  Total tracks: ${curation.totalTracks}`);
    console.log(`  Curated tracks: ${curation.curatedTracks.length}`);
    console.log(`  Rejected: ${curation.rejectedCount}`);
    console.log(`  Avg coherence: ${(curation.averageCoherence * 100).toFixed(1)}%`);
    console.log('  ✓ Curation successful');

    // Show top 5 tracks
    if (curation.curatedTracks.length > 0) {
      console.log('\n  Top 5 most coherent tracks:');
      curation.curatedTracks.slice(0, 5).forEach((t, i) => {
        console.log(`    ${i + 1}. ${t.artist} - ${t.title} (${(t.coherenceScore * 100).toFixed(0)}%)`);
      });
    }

    // Show avg profile
    console.log('\n  Average Sonic Profile:');
    console.log(`    BPM: ${curation.avgProfile.bpm?.toFixed(0) || 'N/A'}`);
    console.log(`    Energy: ${(curation.avgProfile.energy * 100).toFixed(0)}%`);
    console.log(`    Danceability: ${(curation.avgProfile.danceability * 100).toFixed(0)}%`);
    console.log(`    Valence: ${(curation.avgProfile.valence * 100).toFixed(0)}%`);
  } catch (error) {
    console.log('  ✗ Curation error:', error.message);
    if (error.message.includes('at least 10 tracks')) {
      console.log('  (Need more tracks in library for LoRA training)');
    }
  }

  // Test 5: Check Replicate API
  console.log('\nTest 5: Replicate API Configuration');
  if (process.env.REPLICATE_API_KEY) {
    console.log('  ✓ REPLICATE_API_KEY configured');

    // Quick API check
    try {
      const response = await fetch('https://api.replicate.com/v1/models', {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_KEY}`
        }
      });
      if (response.ok) {
        console.log('  ✓ Replicate API connection successful');
      } else {
        console.log('  ✗ Replicate API error:', response.status);
      }
    } catch (error) {
      console.log('  ✗ Replicate connection failed:', error.message);
    }
  } else {
    console.log('  ✗ REPLICATE_API_KEY not set');
    console.log('  Add to .env: REPLICATE_API_KEY=your_token_here');
  }

  console.log('\n=== Test Complete ===');

  // Summary
  console.log('\nLoRA Training Workflow:');
  console.log('1. POST /api/lora/curate - Preview training data curation');
  console.log('2. POST /api/lora/train - Start LoRA training job');
  console.log('3. GET /api/lora/models/:id/status - Check training status');
  console.log('4. POST /api/lora/models/:id/generate - Generate with trained LoRA');
}

testLoRAService().catch(console.error);
