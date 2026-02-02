import { generate, loadModel, isModelLoaded } from './localLLM';
import { buildContext, formatContextPrompt } from './contextBuilder';
import { JournalEntry } from '../store/journalStore';

export interface EntryInsights {
    summary: string;
    lesson: string;
    moodAnalysis: string;
    reflectionPrompt: string;
}

export const generateInsights = async (
    entryContent: string,
    mood: string,
    pastEntries: JournalEntry[]
): Promise<EntryInsights> => {
    console.log('generateInsights called');
    try {
        if (!isModelLoaded()) {
            console.log('Model not loaded, loading now!');
            await loadModel();
            console.log('Model loaded successfully');
        }

        const relevantEntries = buildContext(entryContent, mood, pastEntries);
        const contextStr = formatContextPrompt(relevantEntries);

        const prompt = `<|system|>
You are a journal companion. You MUST respond using EXACTLY this format with each section on its own line:

SUMMARY: [2 sentences about the entry]
LESSON: [1 key insight for the writer]
MOOD: [brief emotional analysis]
QUESTION: [reflection question for tomorrow]

Do NOT write paragraphs. Use ONLY the format above with each marker at the start of a new line.
Use this example as a guide:
  Example:                                                                
  SUMMARY: Today was challenging at work. I felt overwhelmed by deadlines.
  LESSON: Remember to take breaks when feeling stressed.                  
  MOOD: Anxious but hopeful about tomorrow.                               
  QUESTION: What is one small thing you can do tomorrow to reduce stress? 
</s>
<|user|>
Journal entry: "${entryContent}"
Mood: ${mood}
${contextStr ? `Past context: ${contextStr}` : ''}

Respond using the exact format specified.
</s>
<|assistant|>`;
        console.log('Generated prompt for LLM:', prompt);
        const response = await generate(prompt);
        console.log('LLM raw response:', response);
        // Parse the response - we started with { so prepend it             
        /*const jsonStr = '{' + response.split('}')[0] + '}';                 
        console.log('Attempting to parse:', jsonStr);   
        console.log('end of jsonStr');                    
        // Find the end of the JSON object                                      
  const endIndex = jsonStr.lastIndexOf('}');                              
  const cleanJson = endIndex > 0 ? jsonStr.substring(0, endIndex + 1) :   
  jsonStr + '"}'; */
        const insights = parseMarkedResponse(response, mood);
        return insights;
        //console.log('Attempting to parse:', cleanJson);
        // Parse JSON from response                                           
        /*try {
            /*let jsonText = response.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g,
                    '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```\n?/g, '');
            }

            const parsed = JSON.parse(cleanJson);
            return {
                summary: parsed.summary || 'Entry recorded.',
                lesson: parsed.lesson || 'Keep journaling to discover more insights.',
                moodAnalysis: parsed.moodAnalysis || 'You are feeling ${mood}.',
                reflectionPrompt: parsed.reflectionPrompt || 'What will tomorrow bring?',
            };
        } catch (parseError) {
            console.error('JSON parse from LLM response failed, using fallback.');
            // Fallback if JSON parsing fails                                   
            return {
                summary: 'Your entry has been recorded.',
                //lesson: response.substring(0, 200),
                lesson: extractLesson(response) || 'Taking time to reflect is valuable.',
                moodAnalysis: `You seem to be feeling ${mood}`,
                reflectionPrompt: 'What made you feel this way today?',
            };
        }*/
    } catch (e: any) {
        console.error('generateInsights failed:', e);
        return {
            summary: 'Your entry has been recorded.',
            lesson: 'Taking time to journal is a great habit.',
            moodAnalysis: `You seem to be feeling ${mood}`,
            reflectionPrompt: 'What made you feel this way today?',
        };
    }
};

function parseMarkedResponse(response: string, mood: string):
    EntryInsights {
    // Extract content between markers - match until next marker or end
    const summaryMatch = response.match(/SUMMARY[:\s]*(.+?)(?=LESSON:|MOOD:|QUESTION:|$)/is);
    console.log('Summary match:', summaryMatch);
    const lessonMatch = response.match(/LESSON[:\s]*(.+?)(?=MOOD:|QUESTION:|$)/is);
    console.log('Lesson match:', lessonMatch);
    const moodMatch = response.match(/MOOD[:\s]*(.+?)(?=QUESTION:|$)/is);
    console.log('Mood match:', moodMatch);
    const questionMatch = response.match(/QUESTION[:\s]*(.+?)$/is);
    console.log('Question match:', questionMatch);
    // Clean up extracted text
    const clean = (text: string | undefined) => {
        if (!text) return null;
        return text
            .replace(/^[:\s\d.]+/, '')  // Remove leading colons, spaces, numbers
            .replace(/\s+/g, ' ')        // Collapse multiple whitespace to single space
            .trim()
            .substring(0, 300);
    };

    // Also try to extract first sentence as summary if no markers found  
    const firstSentence = response.split(/[.!?]/)[0]?.trim();

    return {
        summary: clean(summaryMatch?.[1]) || firstSentence || 'Your thoughts have been captured.',
        lesson: clean(lessonMatch?.[1]) || extractFirstMeaningful(response,
            50) || 'Reflection helps us grow.',
        moodAnalysis: clean(moodMatch?.[1]) || `Your mood today: ${mood}`,
        reflectionPrompt: clean(questionMatch?.[1]) || 'What will you carry forward from today?',
    };
}

function extractFirstMeaningful(text: string, minLength: number): string
    | null {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length >
        minLength);
    return sentences[0]?.trim().substring(0, 200) || null;
}

function extractLesson(text: string): string | null {
    // Take first meaningful sentence                                     
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length > 0) {
        return sentences[0].trim().substring(0, 200);
    }
    return null;
}   