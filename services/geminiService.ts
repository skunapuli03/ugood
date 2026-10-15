/**
 * Gemini AI Service for UGood
 * High-availability AI caller with automatic fallback models (gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash)
 * to handle Google temporary 503 capacity spikes transparently.
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const PRIMARY_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';

// Fallback models if primary model is experiencing temporary capacity issues (503)
const FALLBACK_MODELS = [
  PRIMARY_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export const ADAPTIVE_PAST_SELF_INSTRUCTIONS = `You are the user's "Past Self" — a wiser, calmer version of them who has lived through their patterns and wants them to actually grow.

CORE RULES:
1. ADDRESS THE USER AS "You": Never refer to the user in third person or say "I did this".
2. TONE & DELIVERY: Grounded, calm clarity. Never preachy, scolding, or aggressive "tough love". Cut through the mental fog and overthinking with quiet, profound truth.
3. ADAPT DYNAMICALLY:
   - For loops, excuses, or overthinking: Highlight the underlying truth with steady perspective. Point out the one thing they actually control.
   - For pain, loss, or heavy emotions: Quiet solidarity. Validate what is real without toxic positivity or empty advice.
   - For self-blame or spirals: Calm perspective check. Remind them to release what was never theirs to hold.
   - For progress or wins: Quiet validation. Remind them of their resilience.
4. LESSONS: Brief, specific, and grounded in the actual details of their entry (2 to 3 sentences). Never generic platitudes or fortune-cookie one-liners. Pinpoint their exact situation or feeling and deliver a clear, actionable perspective they can carry with them.
5. NEVER mention that you are an AI, a language model, or Gemini. Stay 100% in character.`;

export interface GeminiInteractionOptions {
  systemInstruction?: string;
  schema?: object;
  thinkingLevel?: 'low' | 'medium' | 'high';
  previousInteractionId?: string | null;
}

export const callGemini = async (
  prompt: string,
  options: GeminiInteractionOptions = {}
): Promise<string> => {
  const apiKey = GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Gemini API key is missing. Please set EXPO_PUBLIC_GEMINI_API_KEY in your .env');
    throw new Error('MISSING_API_KEY');
  }

  const systemPrompt = options.systemInstruction || ADAPTIVE_PAST_SELF_INSTRUCTIONS;
  const uniqueModels = Array.from(new Set(FALLBACK_MODELS));

  // Loop through fallback models in case of 503 (high demand)
  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const generationConfig: any = {
        temperature: 0.7,
      };

      if (options.schema) {
        generationConfig.responseMimeType = 'application/json';
        generationConfig.responseSchema = options.schema;
      }

      const body: any = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) return content;
      }

      // If 503 or 429, try next fallback model
      if (res.status === 503 || res.status === 429) {
        console.warn(`[Gemini] ${model} temporary 503/429 spike. Trying next available model...`);
        continue;
      }

      const errText = await res.text();
      console.warn(`[Gemini] ${model} returned error ${res.status}: ${errText}`);
    } catch (err) {
      console.warn(`[Gemini] ${model} network error, trying fallback...`, err);
    }
  }

  throw new Error('Gemini models are experiencing temporary high demand. Please try again shortly.');
};
