import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const supabase = createClient("https://ggksgziwgftlyfngtolu.supabase.co", "YOUR_SUPABASE_KEY");

export default async function handler(req, res) {
  console.log("Handler called with method:", req.method); // Debug log

  const { userId } = req.body;
  console.log("Received request for userId:", userId); // Debug log

  if (!userId) {
    console.log("Missing userId in request"); // Debug log
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    console.log("Fetching journals for userId:", userId); // Debug log

    const { data: journals, error } = await supabase
      .from('journals')
      .select('content,reflection')
      .eq('user_id', userId);

    if (error) {
      console.error("Supabase error:", error); // Debug log
      throw error;
    }

    console.log("Fetched journals:", journals); // Debug log

    if (!journals || journals.length === 0) {
      console.log("No journals found for user."); // Debug log
      return res.json({
        articles: [],
        videos: [],
        books: [],
        message: "You don't have any journals yet. Start journaling to get personalized resources!",
      });
    }

    const filteredJournals = journals.filter(j => j.reflection && j.reflection.trim() !== '');
    console.log("Filtered journals with reflections:", filteredJournals); // Debug log

    if (filteredJournals.length === 0) {
      console.log("No reflections found in journals."); // Debug log
      return res.json({
        articles: [],
        videos: [],
        books: [],
        message: "No reflections found in your journals. Add reflections to get personalized resources!",
      });
    }

    const context = filteredJournals
      .map(j => `Entry: ${j.content}\nLesson: ${j.reflection}`)
      .join('\n\n');
    console.log("Generated context for AI:", context); // Debug log

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `
      Based on these journal entries and lessons, suggest:
      - 3-5 helpful articles (with title and link)
      - 3-5 helpful videos (with title and link)
      - 3-5 helpful books (with title and link)
      Journals and Lessons:
      ${context}
      Respond ONLY as valid JSON with this exact format:
      {
        "articles": [{"title": "string", "url": "string"}],
        "videos": [{"title": "string", "url": "string"}],
        "books": [{"title": "string", "url": "string"}]
      }
    `;
    console.log("Generated AI prompt:", prompt); // Debug log

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("AI response (raw):", text); // Debug log

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response:", e); // Debug log
      return res.status(500).json({
        error: "AI response not valid JSON",
        raw: text,
      });
    }

    return res.json(parsed);

  } catch (err) {
    console.error("Error in handler:", err); // Debug log
    return res.status(500).json({
      error: 'Failed to generate resources',
      details: err.message,
    });
  }
}

{error && (
  <p style={{ color: 'red' }}>
    {error === 'Failed to load resources.'
      ? 'An error occurred while loading resources. Please try again later.'
      : error}
  </p>
)}