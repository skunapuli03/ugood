import { JournalEntry } from '../store/journalStore';

const MAX_CONTEXT_DAYS = 6;
const MAX_ENTRY_LENGTH = 500;

export const buildContext = (
    currentContent: string,
    currentMood: string,
    allEntries: JournalEntry[]
): JournalEntry[] => {
    // 1. Filter out the current entry we are writing right now
    const pastEntries = allEntries.filter(entry => entry.content !== currentContent);

    // 2. Sort chronologically (newest first, which is how they usually come from Supabase, but let's be safe)
    pastEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 3. Take the last N days/entries to create a linear "rolling window" of history
    const recentWindow = pastEntries.slice(0, MAX_CONTEXT_DAYS);

    // 4. Reverse it so it reads chronologically forward (oldest of the bunch -> newest of the bunch)
    // This helps the AI understand the sequence of events leading up to today.
    return recentWindow.reverse();
};

export const formatContextPrompt = (entries: JournalEntry[]): string => {
    if (entries.length === 0) return 'No previous entries.';

    return entries
        .map(entry => {
            const date = new Date(entry.created_at).toLocaleDateString();
            const content = entry.content.length > MAX_ENTRY_LENGTH
                ? entry.content.substring(0, MAX_ENTRY_LENGTH) + '...'
                : entry.content;
            return `[${date}] Mood: ${entry.mood}\n${content}`;
        })
        .join('\n\n');
};