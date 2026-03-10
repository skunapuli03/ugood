/**
 * Model Provider - Abstraction layer for switching between AI models
 *
 * This module provides a unified interface for running different AI models
 * for journal entry analysis. It supports both local models (via llama.rn)
 * and cloud APIs (Gemini, OpenAI, etc.).
 */

import { JournalEntry } from '../store/journalStore';
import { buildContext, formatContextPrompt } from './contextBuilder';

export interface EntryInsights {
  summary: string;
  lesson: string;
  moodAnalysis: string;
  reflectionPrompt: string;
}

export type ModelType = 'qwen' | 'gemini' | 'deepseek' | 'tinyllama' | 'mock';

export interface ModelConfig {
  id: ModelType;
  name: string;
  type: 'local' | 'api' | 'mock';
  description: string;
  modelUrl?: string;
  requiresApiKey?: boolean;
  isAvailable: boolean;
}

// Available model configurations
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'qwen',
    name: 'Qwen 2.5 1.5B',
    type: 'local',
    description: 'Fast, local model. Good balance of speed and quality.',
    modelUrl: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    isAvailable: true,
  },
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash',
    type: 'api',
    description: 'Cloud-based, high quality. Requires internet and API key.',
    requiresApiKey: true,
    isAvailable: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek R1 1.5B',
    type: 'local',
    description: 'Reasoning-focused local model. Good for deep analysis.',
    modelUrl: 'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    isAvailable: true,
  },
  {
    id: 'tinyllama',
    name: 'TinyLlama 1.1B',
    type: 'local',
    description: 'Smallest and fastest. Lower quality but very quick.',
    modelUrl: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    isAvailable: true,
  },
  {
    id: 'mock',
    name: 'Mock (Testing)',
    type: 'mock',
    description: 'Returns predefined responses. For testing only.',
    isAvailable: true,
  },
];

// Current model state
let currentModel: ModelType = 'qwen';
let localModelContext: any = null;

// Get current model
export const getCurrentModel = (): ModelType => currentModel;

// Set current model
export const setCurrentModel = (model: ModelType): void => {
  if (model !== currentModel) {
    // Unload previous local model if switching
    if (localModelContext) {
      try {
        localModelContext.release();
      } catch (e) {
        console.warn('Failed to release previous model:', e);
      }
      localModelContext = null;
    }
    currentModel = model;
    console.log(`Model switched to: ${model}`);
  }
};

// Get model config
export const getModelConfig = (model: ModelType): ModelConfig | undefined => {
  return AVAILABLE_MODELS.find(m => m.id === model);
};

// Build prompt based on model type
const buildPrompt = (
  model: ModelType,
  content: string,
  mood: string,
  contextStr: string
): string => {
  // Use consistent field names across all models for easier parsing
  const jsonStructure = '{"summary": "2-3 sentence summary", "lesson": "key insight or lesson", "moodAnalysis": "emotional analysis", "reflectionPrompt": "thoughtful question ending with ?"}';

  switch (model) {
    case 'qwen':
    case 'deepseek':
      return `<|im_start|>system
You are a compassionate journal companion. Analyze journal entries and provide supportive insights. Always respond with valid JSON only, no other text.<|im_end|>
<|im_start|>user
Analyze this journal entry and respond with JSON:

Entry: "${content}"
Mood: ${mood}${contextStr ? `\n\nPast entries for context:\n${contextStr}` : ''}

Respond with this exact JSON structure:
${jsonStructure}<|im_end|>
<|im_start|>assistant
{`;

    case 'tinyllama':
      return `<|system|>
You are a compassionate journal companion. Analyze journal entries and provide supportive insights. Always respond with valid JSON only, no other text.
</s>
<|user|>
Analyze this journal entry and respond with JSON:

Entry: "${content}"
Mood: ${mood}${contextStr ? `\n\nPast entries for context:\n${contextStr}` : ''}

Respond with this exact JSON structure:
${jsonStructure}
</s>
<|assistant|>
{`;

    case 'gemini':
      return `Analyze this journal entry and provide insights in the following JSON format:
{
  "summary": "A brief 2-3 sentence summary of the entry",
  "lesson": "A key lesson learned or insight from this entry",
  "moodAnalysis": "Analysis of the mood and emotional state",
  "reflectionPrompt": "A thoughtful question to encourage deeper reflection, ending with ?"
}

Journal Entry:
${content}

Mood: ${mood}
${contextStr ? `\nPast Context:\n${contextStr}` : ''}

Provide only the JSON response, no additional text.`;

    default:
      return content;
  }
};

// Parse response based on model type
const parseResponse = (
  model: ModelType,
  response: string,
  mood: string
): EntryInsights => {
  try {
    let jsonStr = response.trim();

    // Handle JSON wrapped in markdown code blocks
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }

    // For local models that we prime with {, prepend it
    if (model !== 'gemini' && model !== 'mock' && !jsonStr.startsWith('{')) {
      jsonStr = '{' + jsonStr;
    }

    // Use brace counting to find the complete JSON object (handles nested braces)
    const startIdx = jsonStr.indexOf('{');
    if (startIdx !== -1) {
      let braceCount = 0;
      let endIdx = -1;
      for (let i = startIdx; i < jsonStr.length; i++) {
        if (jsonStr[i] === '{') braceCount++;
        if (jsonStr[i] === '}') braceCount--;
        if (braceCount === 0) {
          endIdx = i;
          break;
        }
      }
      if (endIdx !== -1) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }
    }

    const parsed = JSON.parse(jsonStr);

    return {
      summary: parsed.summary || 'Your thoughts have been captured.',
      lesson: parsed.lesson || 'Reflection helps us grow.',
      moodAnalysis: parsed.moodAnalysis || parsed.mood || `Your mood today: ${mood}`,
      reflectionPrompt: parsed.reflectionPrompt || parsed.question || 'What will you carry forward?',
    };
  } catch (e) {
    console.warn('Failed to parse model response:', e, 'Raw:', response.substring(0, 200));
    return {
      summary: 'Your entry has been recorded.',
      lesson: 'Taking time to reflect is valuable.',
      moodAnalysis: `You seem to be feeling ${mood}`,
      reflectionPrompt: 'What made you feel this way today?',
    };
  }
};

// Run local model (llama.rn)
const runLocalModel = async (
  model: ModelType,
  prompt: string
): Promise<string> => {
  const { initLlama } = await import('llama.rn');
  const FileSystem = await import('expo-file-system/legacy');

  const config = getModelConfig(model);
  if (!config || !config.modelUrl) {
    throw new Error(`Invalid model configuration for ${model}`);
  }

  const MODEL_DIR = FileSystem.documentDirectory + 'models/';
  const MODEL_PATH = MODEL_DIR + `${model}.gguf`;

  // Check if model is downloaded
  const info = await FileSystem.getInfoAsync(MODEL_PATH);
  if (!info.exists) {
    throw new Error(`Model ${model} not downloaded. Please download it first.`);
  }

  // Initialize context if not already done
  if (!localModelContext) {
    localModelContext = await initLlama({ model: MODEL_PATH, n_ctx: 4096 });
  }

  const result = await localModelContext.completion({
    prompt,
    n_predict: 400,
    temperature: 0.3,
    stop: ['<|im_end|>', '<|im_start|>', '</s>', '<|user|>', '<|system|>'],
  });

  return result.text;
};

// Run Gemini API
const runGeminiModel = async (prompt: string): Promise<string> => {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  if (!API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

// Run mock model (for testing)
const runMockModel = async (
  content: string,
  mood: string
): Promise<EntryInsights> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const isPositive = mood === '😊';
  const isNegative = mood === '😔';

  // Analyze content keywords for better mock responses
  const lowerContent = content.toLowerCase();
  const hasWork = lowerContent.includes('work') || lowerContent.includes('job');
  const hasFamily = lowerContent.includes('family') || lowerContent.includes('friend');
  const hasHealth = lowerContent.includes('health') || lowerContent.includes('exercise') || lowerContent.includes('gym');

  let summary = 'This entry reflects on daily experiences. ';
  let lesson = 'Taking time to reflect is valuable.';
  let moodAnalysis = `The writer appears to be feeling ${mood === '😊' ? 'positive' : mood === '😔' ? 'challenged' : 'balanced'}.`;
  let reflectionPrompt = 'What would make tomorrow even better?';

  if (hasWork) {
    summary = isPositive
      ? 'A productive day at work with notable achievements. The entry shows professional growth.'
      : isNegative
        ? 'Work presented challenges today. The entry reflects on workplace difficulties.'
        : 'A routine work day with both ups and downs.';
    lesson = isPositive
      ? 'Hard work and persistence lead to recognition.'
      : 'Setting boundaries at work is essential for wellbeing.';
    reflectionPrompt = 'What aspect of your work brings you the most fulfillment?';
  } else if (hasFamily) {
    summary = 'Time spent with loved ones is documented here. Relationships take center stage.';
    lesson = 'Nurturing relationships requires intentional effort.';
    reflectionPrompt = 'How can you show appreciation to someone important in your life?';
  } else if (hasHealth) {
    summary = 'This entry focuses on physical or mental wellbeing. Health-conscious choices are evident.';
    lesson = 'Investing in health pays dividends in all areas of life.';
    reflectionPrompt = 'What small health habit could you maintain this week?';
  }

  return { summary, lesson, moodAnalysis, reflectionPrompt };
};

/**
 * Generate insights for a journal entry using the current model
 */
export const generateInsights = async (
  entryContent: string,
  mood: string,
  pastEntries: JournalEntry[] = []
): Promise<EntryInsights> => {
  console.log(`Generating insights with model: ${currentModel}`);

  try {
    // Build context from past entries
    const relevantEntries = buildContext(entryContent, mood, pastEntries);
    const contextStr = formatContextPrompt(relevantEntries);

    // Mock model returns directly
    if (currentModel === 'mock') {
      return runMockModel(entryContent, mood);
    }

    // Build prompt for the model
    const prompt = buildPrompt(currentModel, entryContent, mood, contextStr);
    console.log('Generated prompt:', prompt.substring(0, 200) + '...');

    let response: string;

    if (currentModel === 'gemini') {
      response = await runGeminiModel(prompt);
    } else {
      response = await runLocalModel(currentModel, prompt);
    }

    console.log('Model response:', response.substring(0, 200) + '...');

    return parseResponse(currentModel, response, mood);
  } catch (e: any) {
    console.error(`generateInsights failed for ${currentModel}:`, e);

    // Return fallback insights
    return {
      summary: 'Your entry has been recorded.',
      lesson: 'Taking time to journal is a great habit.',
      moodAnalysis: `You seem to be feeling ${mood}`,
      reflectionPrompt: 'What made you feel this way today?',
    };
  }
};

/**
 * Check if a model is downloaded (for local models)
 */
export const isModelDownloaded = async (model: ModelType): Promise<boolean> => {
  const config = getModelConfig(model);

  if (!config) return false;
  if (config.type === 'api' || config.type === 'mock') return true;

  try {
    const FileSystem = await import('expo-file-system/legacy');
    const MODEL_PATH = FileSystem.documentDirectory + 'models/' + `${model}.gguf`;
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    return info.exists;
  } catch {
    return false;
  }
};

/**
 * Download a local model
 */
export const downloadModel = async (
  model: ModelType,
  onProgress: (progress: number) => void
): Promise<void> => {
  const config = getModelConfig(model);

  if (!config || config.type !== 'local' || !config.modelUrl) {
    throw new Error(`Cannot download model: ${model}`);
  }

  const FileSystem = await import('expo-file-system/legacy');
  const MODEL_DIR = FileSystem.documentDirectory + 'models/';
  const MODEL_PATH = MODEL_DIR + `${model}.gguf`;

  await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

  const callback = (downloadProgress: any) => {
    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
    onProgress(progress);
  };

  const downloadResumable = FileSystem.createDownloadResumable(
    config.modelUrl,
    MODEL_PATH,
    {},
    callback
  );

  await downloadResumable.downloadAsync();
};

/**
 * Release current model from memory
 */
export const releaseModel = (): void => {
  if (localModelContext) {
    try {
      localModelContext.release();
    } catch (e) {
      console.warn('Failed to release model:', e);
    }
    localModelContext = null;
  }
};
