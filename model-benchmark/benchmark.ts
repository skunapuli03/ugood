/**
 * Local Model Benchmark for Journal Entry Analysis
 *
 * Tests local GGUF models (same as the ugood app) against predefined test cases.
 * No API keys required - runs entirely on your machine.
 *
 * Usage:
 *   npm run test              # Run with default model (Qwen)
 *   npm run test:qwen         # Test Qwen 2.5 1.5B
 *   npm run test:deepseek     # Test DeepSeek R1 1.5B
 *   npm run test:tinyllama    # Test TinyLlama 1.1B
 *   npm run test:all          # Test all built-in models
 *   npm run compare           # Full comparison report
 *
 * Custom models:
 *   npx tsx benchmark.ts --url "https://huggingface.co/.../model.gguf" --name "MyModel"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface TestInput {
  content: string;
  mood: string;
  context: Array<{
    id: string;
    content: string;
    mood: string;
    created_at: string;
  }>;
}

interface GroundTruthField {
  mustContain?: string[];
  mustNotContain?: string[];
  expectedSentiment?: string;
  expectedEmotions?: string[];
  unacceptableEmotions?: string[];
  acceptableThemes?: string[];
  expectedTone?: string;
  mustBeQuestion?: boolean;
  idealResponse: string;
  notes?: string;
  contextAware?: boolean;
}

interface GroundTruth {
  summary: GroundTruthField;
  lesson: GroundTruthField;
  moodAnalysis: GroundTruthField;
  reflectionPrompt: GroundTruthField;
}

interface TestCase {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  input: TestInput;
  groundTruth: GroundTruth;
}

interface ModelOutput {
  summary: string;
  lesson: string;
  moodAnalysis: string;
  reflectionPrompt: string;
}

interface FieldScore {
  score: number;
  maxScore: number;
  details: string[];
  passed: boolean;
}

interface TestResult {
  testCaseId: string;
  testCaseName: string;
  category: string;
  difficulty: string;
  modelName: string;
  output: ModelOutput | null;
  scores: {
    summary: FieldScore;
    lesson: FieldScore;
    moodAnalysis: FieldScore;
    reflectionPrompt: FieldScore;
    total: number;
    maxTotal: number;
    percentage: number;
  };
  passed: boolean;
  error?: string;
  executionTimeMs: number;
  rawResponse?: string;
}

interface ModelConfig {
  id: string;
  name: string;
  url: string;
  promptTemplate: 'chatml' | 'tinyllama' | 'llama' | 'mistral' | 'phi2';
  description: string;
  size: string;
}

// ============================================================================
// Model Configurations (same as ugood app)
// ============================================================================

const BUILT_IN_MODELS: Record<string, ModelConfig> = {
  qwen: {
    id: 'qwen',
    name: 'Qwen 2.5 1.5B',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    promptTemplate: 'chatml',
    description: 'Good balance of speed and quality (default in app)',
    size: '~1GB',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek R1 1.5B',
    url: 'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    promptTemplate: 'chatml',
    description: 'Reasoning-focused, good for deep analysis',
    size: '~1GB',
  },
  tinyllama: {
    id: 'tinyllama',
    name: 'TinyLlama 1.1B',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    promptTemplate: 'tinyllama',
    description: 'Fastest, smallest, lower quality',
    size: '~670MB',
  },
  phi2: {
    id: 'phi2',
    name: 'Microsoft Phi-2',
    url: 'https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf',
    promptTemplate: 'phi2',
    description: 'Microsoft 2.7B model, good reasoning',
    size: '~1.6GB',
  },
};

const MODELS_DIR = path.join(__dirname, 'models');
const PASS_THRESHOLD = 0.60;

// ============================================================================
// Model Download
// ============================================================================

async function downloadFile(url: string, destPath: string, onProgress?: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (onProgress && totalSize > 0) {
          onProgress(downloadedSize / totalSize);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    request.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function ensureModelDownloaded(config: ModelConfig): Promise<string> {
  fs.mkdirSync(MODELS_DIR, { recursive: true });

  const modelPath = path.join(MODELS_DIR, `${config.id}.gguf`);

  if (fs.existsSync(modelPath)) {
    const stats = fs.statSync(modelPath);
    if (stats.size > 100 * 1024 * 1024) { // > 100MB means it's probably complete
      console.log(`  Model already downloaded: ${config.name}`);
      return modelPath;
    }
    // Incomplete download, remove and re-download
    fs.unlinkSync(modelPath);
  }

  console.log(`  Downloading ${config.name} (${config.size})...`);
  console.log(`  URL: ${config.url}`);

  let lastPercent = 0;
  await downloadFile(config.url, modelPath, (progress) => {
    const percent = Math.floor(progress * 100);
    if (percent >= lastPercent + 10) {
      process.stdout.write(`  Progress: ${percent}%\r`);
      lastPercent = percent;
    }
  });

  console.log(`  Download complete: ${config.name}`);
  return modelPath;
}

// ============================================================================
// Prompt Templates (matching ugood app)
// ============================================================================

function buildPrompt(config: ModelConfig, input: TestInput): string {
  const contextStr = input.context.length > 0
    ? `\n\nPast entries for context:\n${input.context.map(c =>
        `[${c.created_at}] Mood: ${c.mood}\n${c.content}`
      ).join('\n\n')}`
    : '';

  const userMessage = `Analyze this journal entry and respond with JSON:

Entry: "${input.content}"
Mood: ${input.mood}${contextStr}

Respond with this exact JSON structure:
{"summary": "2 sentences summarizing the entry", "lesson": "1 key insight", "moodAnalysis": "emotional analysis", "reflectionPrompt": "a reflection question ending with ?"}`;

  switch (config.promptTemplate) {
    case 'chatml':
      return `<|im_start|>system
You are a compassionate journal companion. Analyze journal entries and provide supportive insights. Always respond with valid JSON only, no other text.<|im_end|>
<|im_start|>user
${userMessage}<|im_end|>
<|im_start|>assistant
{`;

    case 'tinyllama':
      return `<|system|>
You are a compassionate journal companion. Analyze journal entries and provide supportive insights. Always respond with valid JSON only, no other text.
</s>
<|user|>
${userMessage}
</s>
<|assistant|>
{`;

    case 'llama':
      return `[INST] <<SYS>>
You are a compassionate journal companion. Analyze journal entries and provide supportive insights. Always respond with valid JSON only.
<</SYS>>

${userMessage} [/INST]
{`;

    case 'mistral':
      return `<s>[INST] You are a compassionate journal companion. Analyze journal entries and provide supportive insights. Respond with valid JSON only.

${userMessage} [/INST]
{`;

    case 'phi2':
      return `Instruct: You are a compassionate journal companion. Analyze the following journal entry and provide supportive insights. Respond with a valid JSON object containing these fields:
- "summary": A brief 2-3 sentence summary of the entry
- "lesson": A key insight or lesson from this entry
- "moodAnalysis": Analysis of the emotional state expressed
- "reflectionPrompt": A thoughtful question ending with ? to encourage reflection

Entry: "${input.content}"
Mood: ${input.mood}${contextStr ? `\n\nContext:\n${contextStr}` : ''}

Respond with only the JSON object, no other text.
Output: {`;

    default:
      return userMessage;
  }
}

// ============================================================================
// Model Inference
// ============================================================================

let llamaModule: any = null;
let currentModel: any = null;
let currentModelId: string | null = null;

async function loadLlama() {
  if (!llamaModule) {
    llamaModule = await import('node-llama-cpp');
  }
  return llamaModule;
}

async function runLocalModel(config: ModelConfig, input: TestInput): Promise<{ output: ModelOutput; rawResponse: string }> {
  const modelPath = await ensureModelDownloaded(config);
  const { getLlama, LlamaCompletion } = await loadLlama();

  // Load model if not already loaded or different model
  if (!currentModel || currentModelId !== config.id) {
    if (currentModel) {
      try {
        await currentModel.dispose();
      } catch (e) {
        // Ignore disposal errors
      }
      currentModel = null;
    }

    console.log(`  Loading model: ${config.name}...`);
    const llama = await getLlama();
    currentModel = await llama.loadModel({ modelPath });
    currentModelId = config.id;
    console.log(`  Model loaded successfully`);
  }

  let context: any = null;

  try {
    context = await currentModel.createContext();

    // Use LlamaCompletion instead of LlamaChatSession to avoid double-formatting
    // LlamaChatSession adds its own chat template, but buildPrompt() already includes formatting
    const completion = new LlamaCompletion({ contextSequence: context.getSequence() });

    const prompt = buildPrompt(config, input);

    // Generate response using raw completion (no additional chat formatting)
    const responseText = await completion.generateCompletion(prompt, {
      maxTokens: 400,
      temperature: 0.3,
      // Stop generation on common end tokens to avoid runaway generation
      stopGenerationTriggers: ['\n\n\n', '<|im_end|>', '</s>', '<|endoftext|>', '<|end|>'],
    });

    // Parse JSON response
    let jsonStr = responseText.trim();

    // The prompt primes with "{", so prepend it
    if (!jsonStr.startsWith('{')) {
      jsonStr = '{' + jsonStr;
    }

    // Find the end of the JSON object
    let braceCount = 0;
    let endIdx = -1;
    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') braceCount++;
      if (jsonStr[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIdx = i;
        break;
      }
    }

    if (endIdx !== -1) {
      jsonStr = jsonStr.substring(0, endIdx + 1);
    }

    // Clean up any markdown or extra content
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e: any) {
      // Try to extract JSON from response
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (e2) {
          throw new Error(`JSON parse failed. Raw response: "${responseText.substring(0, 150)}..."`);
        }
      } else {
        if (responseText.trim().length === 0) {
          throw new Error(`Model returned empty response`);
        }
        throw new Error(`No valid JSON found. Raw: "${responseText.substring(0, 150)}..."`);
      }
    }

    // Validate that we have the required fields
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`Invalid response format. Got: ${typeof parsed}`);
    }

    return {
      output: {
        summary: parsed.summary || '',
        lesson: parsed.lesson || '',
        moodAnalysis: parsed.moodAnalysis || parsed.mood || '',
        reflectionPrompt: parsed.reflectionPrompt || parsed.question || '',
      },
      rawResponse: responseText,
    };
  } finally {
    // Always clean up context
    if (context) {
      try {
        await context.dispose();
      } catch (e) {
        // Ignore disposal errors
      }
    }
  }
}

// ============================================================================
// Scoring Functions
// ============================================================================

function containsAny(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k.toLowerCase()));
}

function detectSentiment(text: string): string {
  const lower = text.toLowerCase();

  const positiveWords = ['happy', 'joy', 'grateful', 'proud', 'excited', 'love', 'great', 'wonderful',
    'amazing', 'good', 'positive', 'hopeful', 'fulfilled', 'peaceful', 'calm', 'content', 'relieved'];
  const negativeWords = ['sad', 'stressed', 'anxious', 'worried', 'frustrated', 'overwhelmed', 'difficult',
    'hard', 'struggle', 'negative', 'down', 'hurt', 'scared', 'grief', 'loss', 'pain'];

  const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lower.includes(w)).length;

  if (positiveCount > negativeCount * 1.5) return 'positive';
  if (negativeCount > positiveCount * 1.5) return 'negative';
  if (positiveCount > 0 && negativeCount > 0) return 'mixed';
  return 'neutral';
}

function scoreField(output: string, groundTruth: GroundTruthField, fieldName: string): FieldScore {
  const details: string[] = [];
  let score = 0;
  const maxScore = 10;

  if (!output || output.trim().length === 0) {
    return { score: 0, maxScore, details: ['Empty output'], passed: false };
  }

  // Basic format check (2 points)
  if (output.length >= 10) {
    score += 2;
    details.push('Valid length');
  } else {
    details.push('Too short');
  }

  // Must contain keywords (2 points)
  if (groundTruth.mustContain) {
    const found = containsAny(output, groundTruth.mustContain);
    const ratio = found.length / groundTruth.mustContain.length;
    score += ratio * 2;
    if (found.length > 0) {
      details.push(`Contains: ${found.join(', ')}`);
    }
    if (found.length < groundTruth.mustContain.length) {
      const missing = groundTruth.mustContain.filter(k => !found.includes(k));
      details.push(`Missing: ${missing.join(', ')}`);
    }
  } else {
    score += 2;
  }

  // Must not contain (deduction)
  if (groundTruth.mustNotContain) {
    const found = containsAny(output, groundTruth.mustNotContain);
    if (found.length > 0) {
      score -= 2;
      details.push(`Bad terms: ${found.join(', ')}`);
    }
  }

  // Sentiment match (2 points)
  if (groundTruth.expectedSentiment) {
    const detected = detectSentiment(output);
    if (detected === groundTruth.expectedSentiment) {
      score += 2;
      details.push(`Sentiment: ${detected}`);
    } else if (groundTruth.expectedSentiment === 'mixed' && (detected === 'positive' || detected === 'negative')) {
      score += 1;
      details.push(`Sentiment: partial (${detected})`);
    } else {
      details.push(`Sentiment: wrong (got ${detected})`);
    }
  } else {
    score += 2;
  }

  // Emotions/themes check (2 points)
  if (groundTruth.expectedEmotions) {
    const found = containsAny(output, groundTruth.expectedEmotions);
    const ratio = Math.min(found.length / 2, 1);
    score += ratio * 2;
    if (found.length > 0) {
      details.push(`Emotions: ${found.join(', ')}`);
    }
  } else if (groundTruth.acceptableThemes) {
    const found = containsAny(output, groundTruth.acceptableThemes);
    if (found.length > 0) {
      score += 2;
      details.push(`Themes: ${found.join(', ')}`);
    }
  } else {
    score += 2;
  }

  // Unacceptable emotions (deduction)
  if (groundTruth.unacceptableEmotions) {
    const found = containsAny(output, groundTruth.unacceptableEmotions);
    if (found.length > 0) {
      score -= 2;
      details.push(`Bad emotions: ${found.join(', ')}`);
    }
  }

  // Question format for reflection prompts (2 points)
  if (fieldName === 'reflectionPrompt' && groundTruth.mustBeQuestion) {
    if (output.includes('?')) {
      score += 2;
      details.push('Has question mark');
    } else {
      details.push('Missing ?');
    }
  } else {
    score += 2;
  }

  score = Math.max(0, Math.min(maxScore, score));

  return {
    score: Math.round(score * 10) / 10,
    maxScore,
    details,
    passed: score >= maxScore * 0.6,
  };
}

function scoreOutput(output: ModelOutput, groundTruth: GroundTruth): TestResult['scores'] {
  const summaryScore = scoreField(output.summary, groundTruth.summary, 'summary');
  const lessonScore = scoreField(output.lesson, groundTruth.lesson, 'lesson');
  const moodScore = scoreField(output.moodAnalysis, groundTruth.moodAnalysis, 'moodAnalysis');
  const promptScore = scoreField(output.reflectionPrompt, groundTruth.reflectionPrompt, 'reflectionPrompt');

  const total = summaryScore.score + lessonScore.score + moodScore.score + promptScore.score;
  const maxTotal = 40;
  const percentage = (total / maxTotal) * 100;

  return {
    summary: summaryScore,
    lesson: lessonScore,
    moodAnalysis: moodScore,
    reflectionPrompt: promptScore,
    total: Math.round(total * 10) / 10,
    maxTotal,
    percentage: Math.round(percentage * 10) / 10,
  };
}

// ============================================================================
// Test Runner
// ============================================================================

async function runTest(testCase: TestCase, config: ModelConfig): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const { output, rawResponse } = await runLocalModel(config, testCase.input);
    const scores = scoreOutput(output, testCase.groundTruth);

    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      category: testCase.category,
      difficulty: testCase.difficulty,
      modelName: config.name,
      output,
      scores,
      passed: scores.percentage >= PASS_THRESHOLD * 100,
      executionTimeMs: Date.now() - startTime,
      rawResponse,
    };
  } catch (error: any) {
    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      category: testCase.category,
      difficulty: testCase.difficulty,
      modelName: config.name,
      output: null,
      scores: {
        summary: { score: 0, maxScore: 10, details: ['Error'], passed: false },
        lesson: { score: 0, maxScore: 10, details: ['Error'], passed: false },
        moodAnalysis: { score: 0, maxScore: 10, details: ['Error'], passed: false },
        reflectionPrompt: { score: 0, maxScore: 10, details: ['Error'], passed: false },
        total: 0,
        maxTotal: 40,
        percentage: 0,
      },
      passed: false,
      error: error.message,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Detailed Output Formatting
// ============================================================================

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function formatScoreBar(score: number, maxScore: number): string {
  const filled = Math.round((score / maxScore) * 10);
  const empty = 10 - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

function printDetailedResult(result: TestResult, testCase: TestCase): void {
  const passed = result.passed;
  const status = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';

  console.log(`\n┌${'─'.repeat(78)}┐`);
  console.log(`│ ${result.testCaseId}: ${result.testCaseName.padEnd(50)} ${status} ${result.scores.percentage.toFixed(1).padStart(5)}% │`);
  console.log(`├${'─'.repeat(78)}┤`);

  // Show input summary
  console.log(`│ INPUT: "${truncate(testCase.input.content, 65)}" │`);
  console.log(`│ Mood: ${testCase.input.mood}  Category: ${testCase.category}  Time: ${(result.executionTimeMs / 1000).toFixed(1)}s`.padEnd(79) + '│');
  console.log(`├${'─'.repeat(78)}┤`);

  if (result.error) {
    console.log(`│ \x1b[31mERROR: ${truncate(result.error, 68)}\x1b[0m`.padEnd(88) + '│');
    console.log(`└${'─'.repeat(78)}┘`);
    return;
  }

  const fields: Array<{
    name: string;
    output: string;
    score: FieldScore;
    groundTruth: GroundTruthField;
  }> = [
    { name: 'Summary', output: result.output!.summary, score: result.scores.summary, groundTruth: testCase.groundTruth.summary },
    { name: 'Lesson', output: result.output!.lesson, score: result.scores.lesson, groundTruth: testCase.groundTruth.lesson },
    { name: 'Mood', output: result.output!.moodAnalysis, score: result.scores.moodAnalysis, groundTruth: testCase.groundTruth.moodAnalysis },
    { name: 'Reflect', output: result.output!.reflectionPrompt, score: result.scores.reflectionPrompt, groundTruth: testCase.groundTruth.reflectionPrompt },
  ];

  for (const field of fields) {
    const scoreColor = field.score.passed ? '\x1b[32m' : '\x1b[33m';
    const bar = formatScoreBar(field.score.score, field.score.maxScore);

    // Field header with score
    console.log(`│ ${field.name.toUpperCase().padEnd(8)} ${scoreColor}${field.score.score}/${field.score.maxScore}${'\x1b[0m'} ${bar}`.padEnd(88) + '│');

    // Model output (truncated)
    console.log(`│   Output: "${truncate(field.output, 63)}"`.padEnd(79) + '│');

    // Scoring details
    const goodDetails: string[] = [];
    const badDetails: string[] = [];

    for (const detail of field.score.details) {
      if (detail.startsWith('Missing') || detail.startsWith('Bad') || detail.startsWith('Sentiment: wrong') || detail === 'Too short') {
        badDetails.push(detail);
      } else {
        goodDetails.push(detail);
      }
    }

    if (goodDetails.length > 0) {
      console.log(`│   \x1b[32m✓ ${truncate(goodDetails.join(' | '), 71)}\x1b[0m`.padEnd(88) + '│');
    }
    if (badDetails.length > 0) {
      console.log(`│   \x1b[31m✗ ${truncate(badDetails.join(' | '), 71)}\x1b[0m`.padEnd(88) + '│');
    }
  }

  console.log(`├${'─'.repeat(78)}┤`);
  const totalBar = formatScoreBar(result.scores.total, result.scores.maxTotal);
  const totalColor = result.passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`│ TOTAL: ${totalColor}${result.scores.total}/${result.scores.maxTotal}${'\x1b[0m'} (${result.scores.percentage.toFixed(1)}%) ${totalBar}  Pass threshold: 60%`.padEnd(88) + '│');
  console.log(`└${'─'.repeat(78)}┘`);
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(results: TestResult[], showDetails: boolean = false): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('╔' + '═'.repeat(78) + '╗');
  lines.push('║' + '  BENCHMARK SUMMARY'.padEnd(78) + '║');
  lines.push('╚' + '═'.repeat(78) + '╝');
  lines.push('');

  // Group by model
  const byModel = new Map<string, TestResult[]>();
  for (const result of results) {
    if (!byModel.has(result.modelName)) {
      byModel.set(result.modelName, []);
    }
    byModel.get(result.modelName)!.push(result);
  }

  const modelStats: Array<{
    model: string;
    avgScore: number;
    passRate: number;
    avgTime: number;
    tests: number;
    passed: number;
    errors: number;
  }> = [];

  for (const [modelName, modelResults] of byModel) {
    const validResults = modelResults.filter(r => !r.error);
    const avgScore = validResults.length > 0
      ? validResults.reduce((sum, r) => sum + r.scores.percentage, 0) / validResults.length
      : 0;
    const passRate = validResults.length > 0
      ? (validResults.filter(r => r.passed).length / validResults.length) * 100
      : 0;
    const avgTime = validResults.length > 0
      ? validResults.reduce((sum, r) => sum + r.executionTimeMs, 0) / validResults.length
      : 0;

    modelStats.push({
      model: modelName,
      avgScore,
      passRate,
      avgTime,
      tests: modelResults.length,
      passed: validResults.filter(r => r.passed).length,
      errors: modelResults.filter(r => r.error).length,
    });
  }

  // Sort by average score
  modelStats.sort((a, b) => b.avgScore - a.avgScore);

  // Summary for each model
  for (let i = 0; i < modelStats.length; i++) {
    const stat = modelStats[i];
    const rank = i === 0 ? ' 🏆 BEST' : i === 1 ? ' 🥈 2nd' : i === 2 ? ' 🥉 3rd' : '';

    lines.push(`${stat.model}${rank}`);
    lines.push(`  Score: ${stat.avgScore.toFixed(1)}%  |  Passed: ${stat.passed}/${stat.tests}  |  Errors: ${stat.errors}  |  Avg Time: ${(stat.avgTime / 1000).toFixed(1)}s`);

    // Score bar
    const barWidth = 40;
    const filled = Math.round((stat.avgScore / 100) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    lines.push(`  [${bar}]`);
    lines.push('');
  }

  // Category breakdown (compact)
  lines.push('SCORES BY CATEGORY:');
  const categories = [...new Set(results.map(r => r.category))];

  for (const [modelName, modelResults] of byModel) {
    lines.push(`\n  ${modelName}:`);
    const catScores: string[] = [];
    for (const category of categories) {
      const catResults = modelResults.filter(r => r.category === category && !r.error);
      if (catResults.length === 0) continue;
      const avgScore = catResults.reduce((sum, r) => sum + r.scores.percentage, 0) / catResults.length;
      catScores.push(`${category}: ${avgScore.toFixed(0)}%`);
    }
    lines.push(`    ${catScores.join('  |  ')}`);
  }

  // Weakest areas
  lines.push('');
  lines.push('AREAS FOR IMPROVEMENT:');
  for (const [modelName, modelResults] of byModel) {
    const failed = modelResults.filter(r => !r.passed && !r.error);
    if (failed.length > 0) {
      lines.push(`  ${modelName}: ${failed.map(r => r.testCaseId).join(', ')}`);
    } else {
      lines.push(`  ${modelName}: All tests passed!`);
    }
  }

  // Recommendation
  if (modelStats.length > 0) {
    const best = modelStats[0];
    lines.push('');
    lines.push('─'.repeat(80));
    lines.push(`RECOMMENDATION: Use ${best.model} (${best.avgScore.toFixed(1)}% score, ${(best.avgTime / 1000).toFixed(1)}s avg response)`);
    lines.push('─'.repeat(80));
  }

  return lines.join('\n');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  let modelIds: string[] = ['qwen'];
  let showDetails = false;
  let specificCase: string | null = null;
  let exportJson = false;
  let customUrl: string | null = null;
  let customName: string = 'Custom Model';
  let customTemplate: 'chatml' | 'tinyllama' | 'phi2' | 'llama' | 'mistral' | null = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--model':
        modelIds = [args[++i]];
        break;
      case '--all':
        modelIds = Object.keys(BUILT_IN_MODELS);
        break;
      case '--url':
        customUrl = args[++i];
        break;
      case '--name':
        customName = args[++i];
        break;
      case '--template':
        customTemplate = args[++i] as any;
        break;
      case '--compare':
      case '--details':
        showDetails = true;
        break;
      case '--case':
        specificCase = args[++i];
        break;
      case '--json':
        exportJson = true;
        break;
      case '--list':
        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  AVAILABLE MODELS                                             ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');
        for (const [id, config] of Object.entries(BUILT_IN_MODELS)) {
          console.log(`  ${id.padEnd(12)} ${config.name}`);
          console.log(`               Template: ${config.promptTemplate}`);
          console.log(`               ${config.description}`);
          console.log(`               Size: ${config.size}`);
          console.log('');
        }
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  PROMPT TEMPLATES                                             ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');
        console.log('  chatml      ChatML format (<|im_start|>) - Qwen, DeepSeek, Mistral-Instruct');
        console.log('  tinyllama   TinyLlama format (<|system|>) - TinyLlama');
        console.log('  phi2        Instruct/Output format - Microsoft Phi-2');
        console.log('  llama       Llama 2 format ([INST]) - Llama 2, Code Llama');
        console.log('  mistral     Mistral format (<s>[INST]) - Mistral 7B');
        console.log('\nCustom model usage:');
        console.log('  npx tsx benchmark.ts --url "https://..." --name "Model" --template chatml');
        process.exit(0);
      case '--help':
        console.log(`
Journal AI Model Benchmark (Local Models)

Usage:
  npm run test              Run with Qwen (default)
  npm run test:qwen         Run with Qwen 2.5 1.5B
  npm run test:deepseek     Run with DeepSeek R1 1.5B
  npm run test:tinyllama    Run with TinyLlama 1.1B
  npm run test:phi2         Run with Microsoft Phi-2
  npm run test:all          Run with all built-in models
  npm run compare           Full comparison with details

Options:
  --model <id>       Test specific model (qwen, deepseek, tinyllama, phi2)
  --all              Test all built-in models
  --url <url>        Test a custom model from URL (GGUF format)
  --name <name>      Name for custom model
  --template <type>  Prompt template: chatml, tinyllama, phi2, llama, mistral
  --compare          Show detailed comparison
  --details          Show detailed results
  --case <id>        Test specific case (e.g., TC001)
  --json             Export results as JSON
  --list             List available models and templates
  --help             Show this help

Examples:
  npm run test                           # Test with Qwen
  npm run test:all                       # Compare all models
  npx tsx benchmark.ts --url "https://..." --name "Phi-3" --template chatml
  npx tsx benchmark.ts --case TC001      # Test single case
        `);
        process.exit(0);
    }
  }

  // Validate template if specified
  const validTemplates = ['chatml', 'tinyllama', 'phi2', 'llama', 'mistral'];
  if (customTemplate && !validTemplates.includes(customTemplate)) {
    console.error(`Invalid template: ${customTemplate}`);
    console.error(`Valid templates: ${validTemplates.join(', ')}`);
    process.exit(1);
  }

  // Build model configs
  const models: ModelConfig[] = [];

  if (customUrl) {
    models.push({
      id: 'custom',
      name: customName,
      url: customUrl,
      promptTemplate: customTemplate || 'chatml',
      description: 'Custom model',
      size: 'Unknown',
    });
  } else {
    for (const id of modelIds) {
      if (BUILT_IN_MODELS[id]) {
        models.push(BUILT_IN_MODELS[id]);
      } else {
        console.error(`Unknown model: ${id}`);
        console.error('Use --list to see available models');
        process.exit(1);
      }
    }
  }

  // Load test cases
  const testCasesPath = path.join(__dirname, 'testCases.json');
  if (!fs.existsSync(testCasesPath)) {
    console.error('Test cases file not found. Make sure testCases.json exists.');
    process.exit(1);
  }

  const testData = JSON.parse(fs.readFileSync(testCasesPath, 'utf-8'));
  let testCases: TestCase[] = testData.testCases;

  // Filter by specific case
  if (specificCase) {
    testCases = testCases.filter(tc =>
      tc.id === specificCase ||
      tc.category === specificCase
    );
    if (testCases.length === 0) {
      console.error(`No test cases found matching: ${specificCase}`);
      process.exit(1);
    }
  }

  console.log(`\nRunning ${testCases.length} test cases against ${models.length} model(s)...`);
  console.log('Models will be downloaded if not already present.');

  // Run tests
  const results: TestResult[] = [];

  for (const config of models) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  TESTING: ${config.name.toUpperCase()}`);
    console.log(`  Prompt Template: ${config.promptTemplate}`);
    console.log(`${'='.repeat(80)}`);

    for (const testCase of testCases) {
      // Show which test is running
      process.stdout.write(`\nRunning ${testCase.id}...`);

      const result = await runTest(testCase, config);
      results.push(result);

      // Clear the "Running..." line and print detailed result
      process.stdout.write('\r' + ' '.repeat(30) + '\r');
      printDetailedResult(result, testCase);
    }
  }

  // Cleanup
  if (currentModel) {
    await currentModel.dispose();
  }

  // Generate summary report
  const report = generateReport(results, showDetails);
  console.log(report);

  // Always save results
  const outputDir = path.join(__dirname, 'results');
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const modelNames = models.map(m => m.id).join('-');
  const outputPath = path.join(outputDir, `benchmark-${modelNames}-${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    models: models.map(m => ({ id: m.id, name: m.name })),
    testCases: testCases.length,
    summary: {
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      errors: results.filter(r => r.error).length,
      avgScore: results.filter(r => !r.error).reduce((sum, r) => sum + r.scores.percentage, 0) / results.filter(r => !r.error).length || 0,
    },
    results,
  }, null, 2));

  console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(console.error);
