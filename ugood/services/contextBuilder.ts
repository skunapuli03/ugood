import { JournalEntry } from '../store/journalStore';

const MAX_CONTEXT_ENTRIES = 3;
const MAX_ENTRY_LENGTH = 500;

export const buildContext = (
    currentContent: string,
    currentMood: string,
    allEntries: JournalEntry[]
): JournalEntry[] => {
    // Filter out current entry and sort by relevance                     
    const scored = allEntries
        .filter(entry => entry.content !== currentContent)
        .map(entry => ({
            entry,
            score: calculateRelevance(entry, currentMood),
        }))
        .sort((a, b) => b.score - a.score);

    return scored.slice(0, MAX_CONTEXT_ENTRIES).map(s => s.entry);
};

const calculateRelevance = (entry: JournalEntry, currentMood: string):
    number => {
    const now = Date.now();
    const entryDate = new Date(entry.created_at).getTime();
    const daysSince = (now - entryDate) / (1000 * 60 * 60 * 24);

    // Recency score (40%) - entries from last 30 days score higher       
    const recencyScore = Math.max(0, 1 - daysSince / 30) * 0.4;

    // Mood match score (30%)                                             
    const moodScore = entry.mood === currentMood ? 0.3 : 0.1;

    // Base score (30%) for having content                                
    const contentScore = 0.3;

    return recencyScore + moodScore + contentScore;
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