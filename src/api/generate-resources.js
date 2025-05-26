import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // Fetch last 5 days of journals for this user
  const since = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const { data: journals, error } = await supabase
    .from('journals')
    .select('content,reflection')
    .eq('user_id', userId)
    .gte('created_at', since);

  if (error) return res.status(500).json({ error: 'Failed to fetch journals' });

  const context = journals
    .map(j => `Entry: ${j.content}\nLesson: ${j.reflection || ''}`)
    .join('\n\n');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `
      Based on these journal entries and lessons, suggest:
      - 3-5 helpful articles (with title and link)
      - 3-5 helpful videos (with title and link)
      - 3-5 helpful books (with title and link)
      Journals and Lessons:
      ${context}
      Respond as JSON: { "articles": [...], "videos": [...], "books": [...] }
    `;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "AI response not valid JSON", raw: text });
    }
    res.json(parsed);
  } catch (err) {
    console.error('Error generating resources with Gemini:', err);
    res.status(500).json({ error: 'Failed to generate resources', details: err.message });
  }
}