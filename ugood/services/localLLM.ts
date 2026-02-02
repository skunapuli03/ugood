import * as FileSystem from 'expo-file-system/legacy';
import { initLlama, LlamaContext } from 'llama.rn';

const MODEL_URL =
    'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
const MODEL_DIR = FileSystem.documentDirectory + 'models/';
const MODEL_PATH = MODEL_DIR + 'tinyllama.gguf';

let context: LlamaContext | null = null;

export const isModelDownloaded = async (): Promise<boolean> => {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    return info.exists;
};

export const downloadModel = async (onProgress: (progress: number) => void): Promise<void> => {
    await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

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
    
    if(!modelExists){
        throw new Error('Model not downloaded. Please restart the app to download.');
    }else{
      const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);        
      if(!fileInfo.exists){
          throw new Error('Model file does not exist at path: ' + MODEL_PATH);
      }                                                        
      console.log('File size:', fileInfo.size, 'bytes');                  
      console.log('File size MB:', (fileInfo.size || 0) / (1024 * 1024), 'MB');
    }
    try{
        context = await initLlama({ model: MODEL_PATH, n_ctx: 4096 });
        console.log('Model loaded successfully');
    }catch (e: any){
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

export const generate = async (prompt: string): Promise<string> => {
    if (!context) throw new Error('Model not loaded');

    const result = await context.completion({
        prompt,
        n_predict: 400,
        temperature: 0.7,
        stop: ['</s>', '<|user|>', '<|system|>'],
    });

    return result.text;
};
