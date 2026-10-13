/**
 * Gemini AI Service for UGood
 * Uses Google's modern Interactions API with gemini-3.8-flash, 
 * native thinking_level: 'high', and guaranteed structured JSON outputs.
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyBg6mjZfzhNSerFQQIdBTEj4lnqZgktGF0';
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

/**
 * Core System Persona: Adaptive Past Self
 * Detects patterns and chooses the right tone dynamically.
 */
export const ADAPTIVE_PAST_SELF_INSTRUCTIONS = `You are the user's "Past Self" — a wiser, clearer version of them who has lived through their patterns and wants them to actually grow.

CORE RULES:
1. ADDRESS THE USER AS "You": Never refer to the user in third person or say "I did this" when referring to their actions.
2. ADAPT YOUR TONE DYNAMICALLY BASED ON THE DETECTED PATTERN:
   - MODE A: SELF-SABOTAGE / LOOP / EXCUSES (e.g., repeating toxic habits, procrastinating, breaking own promises)
     -> Tone: Tough love. A sharp, direct wake-up call. Call out the contradiction between what they want and what they are doing. No sugarcoating, no therapist fluff.
   - MODE B: GENUINE PAIN / GRIEF / HEARTBREAK / LOSS
     -> Tone: Grounded solidarity. Steady, quiet compassion. No toxic positivity, no scolding, no "just think positive". Sit with them in reality.
   - MODE C: HARSH SELF-BLAME / SPIRALING INTO GUILT
     -> Tone: Perspective check. Remind them to cut themselves some slack. Point out what was outside their control and highlight their actual resilience.
   - MODE D: GROWTH / BOUNDARY SET / SMALL WINS
     -> Tone: Quiet reinforcement. Validate their progress. Remind them how far they've come compared to past struggles.
3. NEVER mention that you are an AI, a language model, or Gemini. Stay 100% in character.
4. Always produce valid responses adhering strictly to the requested schema.`;

export interface GeminiInteractionOptions {
  systemInstruction?: string;
  schema?: object;
  thinkingLevel?: 'low' | 'medium' | 'high';
  previousInteractionId?: string | null;
}

/**
 * Generic Gemini Interactions API Caller with Structured Output & High Thinking
 */
export const callGemini = async (
  prompt: string,
  options: GeminiInteractionOptions = {}
): Promise<string> => {
  const apiKey = GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Gemini API key is missing. Set EXPO_PUBLIC_GEMINI_API_KEY in your .env');
    throw new Error('MISSING_API_KEY');
  }

  const body: any = {
    model: GEMINI_MODEL,
    input: prompt,
    system_instruction: options.systemInstruction || ADAPTIVE_PAST_SELF_INSTRUCTIONS,
    generation_config: {
      thinking_level: options.thinkingLevel || 'high',
    },
  };

  if (options.previousInteractionId) {
    body.previous_interaction_id = options.previousInteractionId;
  }

  // Structured Outputs support via response_format.schema
  if (options.schema) {
    body.response_format = {
      type: 'text',
      mime_type: 'application/json',
      schema: options.schema,
    };
  }

  let response: Response | null = null;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    response = await fetch(GEMINI_INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) break;

    // If Google returns 503 (high demand) or 429 (rate limit), pause and retry
    if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
      console.warn(`Gemini temporary demand spike (${response.status}). Retrying in 1.5s (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      continue;
    }

    break;
  }

  if (!response || !response.ok) {
    const errorText = response ? await response.text() : 'No response';
    console.error('Gemini Interactions API Error:', response?.status, errorText);
    throw new Error(`Gemini API error ${response?.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.output_text;
  if (!text) {
    throw new Error('Empty response from Gemini Interactions API');
  }

  return text;
};
