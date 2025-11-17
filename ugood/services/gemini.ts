import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

if (!API_KEY) {
  console.warn('Gemini API key not found. Set EXPO_PUBLIC_GEMINI_API_KEY in your environment.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const generateInsights = async (entryContent: string, mood: string) => {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Analyze this journal entry and provide insights in the following JSON format:
{
  "summary": "A brief 2-3 sentence summary of the entry",
  "lesson": "A key lesson learned or insight from this entry",
  "moodAnalysis": "Analysis of the mood and emotional state",
  "reflectionPrompt": "A thoughtful question to encourage deeper reflection"
}

Journal Entry:
${entryContent}

Mood: ${mood}

Provide only the JSON response, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const insights = JSON.parse(jsonText);

    return {
      summary: insights.summary || '',
      lesson: insights.lesson || '',
      moodAnalysis: insights.moodAnalysis || '',
      reflectionPrompt: insights.reflectionPrompt || '',
    };
  } catch (error: any) {
    console.error('Error generating insights:', error);
    throw new Error(`Failed to generate insights: ${error.message}`);
  }
};


