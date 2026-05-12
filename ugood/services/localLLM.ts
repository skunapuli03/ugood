import * as FileSystem from 'expo-file-system/legacy';
import { initLlama, LlamaContext } from 'llama.rn';

// Default model: Qwen 2.5 1.5B (best balance of speed and quality)
const MODEL_URL = 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf';
const MODEL_DIR = FileSystem.documentDirectory + 'models/';
const MODEL_PATH = MODEL_DIR + 'qwen.gguf'; 

// Industry Standard: Q4_K_M GGUF for 1.5B is ~1.12GB
const EXPECTED_SIZE = 1117320736; 

let context: LlamaContext | null = null;
let currentTask: string | null = null;
let isGenerating = false;

export const isModelDownloaded = async (): Promise<boolean> => {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    if (!info.exists) return false;
    
    // If the file exists but is significantly smaller than expected, it's corrupted/partial
    // We allow a small margin (1MB) but generally it should match
    return info.size >= EXPECTED_SIZE - 1024 * 1024;
};

export const downloadModel = async (onProgress: (progress: number) => void): Promise<void> => {
    await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

    // Clean up partial downloads before starting a fresh resumable attempt
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    if (info.exists && info.size < EXPECTED_SIZE - 1024 * 1024) {
        console.log(`Deleting partial download (${info.size} bytes)...`);
        await FileSystem.deleteAsync(MODEL_PATH);
    }

    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress(progress);
    };

    const downloadResumable = FileSystem.createDownloadResumable(MODEL_URL, MODEL_PATH, {}, callback);
    await downloadResumable.downloadAsync();
};

export const loadModel = async (): Promise<void> => {
    if (context) return;
    const modelExists = await isModelDownloaded();
    console.log('Model exists:', modelExists);
    console.log('Model path:', MODEL_PATH);

    if (!modelExists) {
        throw new Error('Model not downloaded. Please restart the app to download.');
    } else {
        const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
        if (!fileInfo.exists) {
            throw new Error('Model file does not exist at path: ' + MODEL_PATH);
        }
        console.log('File size:', fileInfo.size, 'bytes');
        console.log('File size MB:', (fileInfo.size || 0) / (1024 * 1024), 'MB');
    }
    try {
        context = await initLlama({ model: MODEL_PATH, n_ctx: 4096 });
        console.log('Model loaded successfully');
    } catch (e: any) {
        console.error('initLlama failed:', e);
        throw new Error('Failed to load model: ' + e.message);
    }
};

export const unloadModel = (): void => {
    if (context) {
        context.release();
        context = null;
    }
};

export const isModelLoaded = (): boolean => context !== null;

export const generate = async (prompt: string, taskName: string = 'General AI Task'): Promise<string> => {
    if (!context) throw new Error('Model not loaded');
    
    if (isGenerating) {
        console.warn(`[AI] Busy: Cannot start "${taskName}" because "${currentTask || 'another task'}" is active.`);
        throw new Error('LLM_BUSY');
    }

    console.log(`[AI] Starting: ${taskName}`);
    isGenerating = true;
    currentTask = taskName;
    try {
        const result = await context.completion({
            prompt,
            n_predict: 1024, // Increased to allow full JSON generation without getting cut off
            temperature: 0.3,
            // ChatML stop tokens for Qwen/DeepSeek, plus common fallbacks
            stop: ['<|im_end|>', '<|im_start|>', '</s>', '<|endoftext|>', '\n\n\n'],
        });

        return result.text;
    } finally {
        isGenerating = false;
        currentTask = null;
    }
};
