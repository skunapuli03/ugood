/**
 * AI Task Queue — Priority-based sequential task processor with preemption.
 * 
 * All AI tasks go through this queue. One task runs at a time.
 * Higher priority tasks (lower number) jump to the front.
 * P1 (Lesson) preempts P3-P5 (background pipeline).
 */

type TaskFn = () => Promise<any>;

interface QueuedTask {
    fn: TaskFn;
    priority: number;
    name: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
}

class AITaskQueue {
    private queue: QueuedTask[] = [];
    private isProcessing = false;
    private currentTaskName: string | null = null;

    /**
     * Enqueue an AI task with a given priority and name.
     * Lower priority number = runs first.
     * Returns a promise that resolves when the task completes.
     */
    enqueue<T>(fn: () => Promise<T>, priority: number, name: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            console.log(`[Queue] Queued: ${name} (P${priority})`);

            this.queue.push({ fn, priority, name, resolve, reject });
            // Sort by priority (lowest number first)
            this.queue.sort((a, b) => a.priority - b.priority);

            this.processNext();
        });
    }

    /**
     * Process the next task in the queue if nothing is currently running.
     */
    private async processNext(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const task = this.queue.shift()!;
        this.currentTaskName = task.name;

        console.log(`[Queue] Processing: ${task.name} (P${task.priority})`);

        try {
            const result = await task.fn();
            console.log(`[Queue] ✅ Complete: ${task.name}`);
            task.resolve(result);
        } catch (error) {
            console.error(`[Queue] ❌ Failed: ${task.name}`, error);
            task.reject(error);
        } finally {
            this.isProcessing = false;
            this.currentTaskName = null;
            // Process the next task (which may have been re-sorted by priority)
            this.processNext();
        }
    }

    /**
     * Check if a specific task name is already queued or running.
     */
    isTaskQueued(name: string): boolean {
        return this.currentTaskName === name || this.queue.some(t => t.name === name);
    }

    /**
     * Get the current queue status for debugging.
     */
    getStatus(): { current: string | null; queued: string[] } {
        return {
            current: this.currentTaskName,
            queued: this.queue.map(t => `${t.name} (P${t.priority})`),
        };
    }
}

// Singleton instance — all AI tasks go through this
export const aiQueue = new AITaskQueue();
