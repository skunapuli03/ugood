import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { BackgroundProcessor } from './backgroundProcessor';
import { useUserStore } from '../store/userStore';

const BACKGROUND_AI_TASK = 'BACKGROUND_AI_TASK';

// 1. Define the task
TaskManager.defineTask(BACKGROUND_AI_TASK, async () => {
  const now = new Date().toLocaleTimeString();
  console.log(`[BackgroundFetch] Task triggered at ${now}`);
  
  try {
    const userId = useUserStore.getState().user?.id;
    if (userId) {
      // Run the smart check (it has internal cooldowns)
      await BackgroundProcessor.runPipeline(userId);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[BackgroundFetch] Task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Register/Unregister functions
export const BackgroundService = {
  async register() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_AI_TASK);
      if (!isRegistered) {
        console.log('[BackgroundService] Registering background AI task...');
        await BackgroundFetch.registerTaskAsync(BACKGROUND_AI_TASK, {
          minimumInterval: 60 * 15, // 15 minutes (OS may throttle further)
          stopOnTerminate: false,   // keep running after app is closed
          startOnBoot: true,        // start after device reboot
        });
      }
    } catch (err) {
      console.warn('[BackgroundService] Failed to register task:', err);
    }
  },

  async unregister() {
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_AI_TASK)) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_AI_TASK);
    }
  }
};
