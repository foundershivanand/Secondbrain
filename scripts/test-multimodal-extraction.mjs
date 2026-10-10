import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SharedMemoryManager,
  MultiAiOrchestrator,
  classifyCategory,
  formatKnowledgeMarkdown,
  updateCategoryIndex
} from './ai-orchestrator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const VAULT_DIR = path.resolve(ROOT_DIR, 'vault');
const KNOWLEDGE_DIR = path.resolve(VAULT_DIR, '01 Knowledge');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const rootEnv = loadEnvFile(path.resolve(ROOT_DIR, '.env'));
const devVars = loadEnvFile(path.resolve(ROOT_DIR, 'api/.dev.vars'));
const env = { ...rootEnv, ...devVars, ...process.env };

const sharedMemory = new SharedMemoryManager();
const orchestrator = new MultiAiOrchestrator(env, sharedMemory);

// 15 curated real screenshots
const TEST_MEDIA_FILES = [
  {
    filePath: '/home/shiva/timeawareness/playstore_assets/phone/phone_01_today\'s_active_journey.png',
    titleHint: "Today's Active Journey Dashboard",
    originPath: '/playstore_assets/phone/phone_01_today\'s_active_journey.png'
  },
  {
    filePath: '/home/shiva/timeawareness/playstore_assets/phone/phone_02_lifespan_statistics.png',
    titleHint: "Lifespan Statistics & Goal Tracking",
    originPath: '/playstore_assets/phone/phone_02_lifespan_statistics.png'
  },
  {
    filePath: '/home/shiva/timeawareness/playstore_assets/phone/phone_03_life_visualized_grid.png',
    titleHint: "Life Visualized Grid System",
    originPath: '/playstore_assets/phone/phone_03_life_visualized_grid.png'
  },
  {
    filePath: '/home/shiva/timeawareness/playstore_assets/phone/phone_04_privacy_&_terms_first.png',
    titleHint: "Privacy & Terms First Onboarding",
    originPath: '/playstore_assets/phone/phone_04_privacy_&_terms_first.png'
  },
  {
    filePath: '/home/shiva/timeawareness/playstore_assets/phone/phone_05_interactive_guide_walkthrough.png',
    titleHint: "Interactive Guide Walkthrough",
    originPath: '/playstore_assets/phone/phone_05_interactive_guide_walkthrough.png'
  },
  {
    filePath: '/home/shiva/timeawareness/playstore_assets/phone/phone_06_multi-unit_grid_switcher.png',
    titleHint: "Multi-Unit Time Grid Switcher",
    originPath: '/playstore_assets/phone/phone_06_multi-unit_grid_switcher.png'
  },
  {
    filePath: '/home/shiva/timeawareness/playstore_assets/phone/phone_07_adaptive_dark_&_light_themes.png',
    titleHint: "Adaptive Dark and Light Themes",
    originPath: '/playstore_assets/phone/phone_07_adaptive_dark_&_light_themes.png'
  },
  {
    filePath: '/home/shiva/timeawareness/playstore_assets/phone/phone_08_glanceable_home_screen_widgets.png',
    titleHint: "Glanceable Home Screen Widgets",
    originPath: '/playstore_assets/phone/phone_08_glanceable_home_screen_widgets.png'
  },
  {
    filePath: '/home/shiva/Downloads/brave_screenshot_cv.fitt.workers.dev.png',
    titleHint: "CV Analytics Web Application",
    originPath: '/Downloads/brave_screenshot_cv.fitt.workers.dev.png'
  },
  {
    filePath: '/home/shiva/Downloads/brave_screenshot_localhost.png',
    titleHint: "Local Development Application UI",
    originPath: '/Downloads/brave_screenshot_localhost.png'
  },
  {
    filePath: '/home/shiva/Downloads/digitalgatekeeping.png',
    titleHint: "Digital Gatekeeping App Interface",
    originPath: '/Downloads/digitalgatekeeping.png'
  },
  {
    filePath: '/home/shiva/Downloads/gaintclock.png',
    titleHint: "Giant Clock Visualization",
    originPath: '/Downloads/gaintclock.png'
  },
  {
    filePath: '/home/shiva/Downloads/gatekeep1.png',
    titleHint: "Gatekeeper Friction Challenge UI",
    originPath: '/Downloads/gatekeep1.png'
  },
  {
    filePath: '/home/shiva/Downloads/gatekeep2.png',
    titleHint: "Gatekeeper App Limits & Access Screen",
    originPath: '/Downloads/gatekeep2.png'
  },
  {
    filePath: '/home/shiva/Downloads/calculator.png',
    titleHint: "Life Expectancy / Time Calculator Interface",
    originPath: '/Downloads/calculator.png'
  }
];

async function runMultimodalBatch() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🧪 Running Test Extraction on 15 Real Screenshots');
  console.log('   Multi-AI Vision Pipeline (Gemini 2.5 Flash Multimodal)');
  console.log('════════════════════════════════════════════════════════════════\n');

  const PROGRESS_FILE = path.resolve(ROOT_DIR, 'terabox-progress.json');
  let progress = { counter: 0, processed: {}, skipped_duplicate: {}, skipped_personal: {}, failed: {} };
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch {}
  }

  let testIndex = 0;
  const results = [];

  for (const item of TEST_MEDIA_FILES) {
    testIndex++;
    if (!fs.existsSync(item.filePath)) {
      console.warn(`⚠️ [${testIndex}/15] File not found: ${item.filePath}, skipping...`);
      continue;
    }

    const filename = path.basename(item.filePath);
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
    const buffer = fs.readFileSync(item.filePath);
    const base64 = buffer.toString('base64');
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

    console.log(`\n▶ [${testIndex}/${TEST_MEDIA_FILES.length}] Analyzing: ${filename} (${sizeMB} MB)`);
    console.log(`   👁️ Sending image bytes directly to Multimodal Vision Engine...`);

    const metaText = `File Name: ${filename}
Source Path: ${item.originPath}
File Size: ${sizeMB} MB
Hint: ${item.titleHint}`;

    const mockItem = {
      filename,
      name: filename,
      path: item.originPath,
      size: buffer.length,
      url: `file://${item.filePath}`,
      priority: 'P1',
      fs_id: 900000 + testIndex
    };

    try {
      const startTime = Date.now();
      const { extraction, modelUsed } = await orchestrator.extractKnowledge(
        mockItem,
        metaText,
        { base64, mimeType }
      );
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

      progress.counter += 1;
      const noteNumber = progress.counter;

      // Classify using rich visual extraction
      const categoryFolder = classifyCategory(mockItem, extraction);
      const categoryFolderPath = path.join(KNOWLEDGE_DIR, categoryFolder);
      if (!fs.existsSync(categoryFolderPath)) {
        fs.mkdirSync(categoryFolderPath, { recursive: true });
      }

      // Format markdown note
      const { filename: noteFilename, content, numStr } = formatKnowledgeMarkdown(
        noteNumber,
        extraction,
        mockItem,
        categoryFolder,
        modelUsed
      );

      // Write note
      const notePath = path.join(categoryFolderPath, noteFilename);
      fs.writeFileSync(notePath, content, 'utf8');

      // Update category catalog table
      updateCategoryIndex(
        categoryFolderPath,
        numStr,
        extraction.title,
        extraction.source_type || 'screenshot',
        extraction.core_idea,
        mockItem.url
      );

      // Record in shared memory
      sharedMemory.recordExtraction(modelUsed, extraction, noteNumber, categoryFolder);

      progress.processed[String(mockItem.fs_id)] = {
        note_number: noteNumber,
        title: extraction.title,
        category: categoryFolder,
        filename: noteFilename,
        model: modelUsed,
        time: new Date().toISOString()
      };
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');

      console.log(`   ✨ Extracted in ${elapsedSec}s [AI: ${modelUsed}]`);
      console.log(`   📁 Category: ${categoryFolder}`);
      console.log(`   📌 Title: #${numStr} "${extraction.title}"`);
      console.log(`   💡 Core Idea: "${extraction.core_idea.slice(0, 110)}..."`);
      console.log(`   📝 Note saved: ${notePath}`);

      results.push({
        numStr,
        title: extraction.title,
        category: categoryFolder,
        coreIdea: extraction.core_idea,
        notePath
      });

      // Throttle to respect rate limits
      await new Promise(r => setTimeout(r, 1500));

    } catch (err) {
      console.error(`   ❌ Extraction failed: ${err.message}`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`🎉 Multimodal Test Completed! ${results.length} Notes Extracted Perfectly`);
  console.log('════════════════════════════════════════════════════════════════');
}

runMultimodalBatch().catch(console.error);
