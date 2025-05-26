import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const supabase = createClient("https://ggksgziwgftlyfngtolu.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8");

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId } = req.body;
  console.log("Received request for userId:", userId); // Debug log

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    // Fetch recent journals
    const since = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const { data: journals, error } = await supabase
      .from('journals')
      .select('content,reflection')
      .eq('user_id', userId)
      .gte('created_at', since);

    if (error) throw error;

    console.log("Found journals:", journals.length); // Debug log

    const context = journals
      .map(j => `Entry: ${j.content}\nLesson: ${j.reflection || ''}`)
      .join('\n\n');

    // Get resources from Gemini
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

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("Gemini response:", text); // Debug log

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response:", e);
      return res.status(500).json({ 
        error: "AI response not valid JSON",
        raw: text 
      });
    }

    return res.json(parsed);

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ 
      error: 'Failed to generate resources', 
      details: err.message 
    });
  }
}