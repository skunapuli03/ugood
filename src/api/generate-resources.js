import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
dotenv.config();

// Initialize Google Generative AI with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || "https://ggksgziwgftlyfngtolu.supabase.co";
// *** IMPORTANT CHANGE HERE ***
// Use the SUPABASE_SERVICE_ROLE_KEY for backend operations to bypass RLS.
// This key MUST be stored securely as an environment variable on your server (Render.com).
// DO NOT expose this key to your frontend.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if the service role key is available
if (!supabaseServiceRoleKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is not set. Please set it as an environment variable.");
  // You might want to throw an error or handle this more gracefully in a real app
  // For now, we'll proceed with anon key, but it will likely fail due to RLS
}

// Initialize Supabase client
// Use the service role key if available, otherwise fall back to anon key (for dev/testing if service key isn't set)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || process.env.SUPABASE_ANON_KEY, {
  // Important for server-side to prevent session persistence
  auth: { persistSession: false },
});


// The main handler for your API endpoint
export default async function handler(req, res) {
  console.log(`[${new Date().toISOString()}] Handler called with method:`, req.method);

  if (req.method !== 'POST') {
    console.warn(`[${new Date().toISOString()}] Method Not Allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method Not Allowed. Please use POST.' });
  }

  const { userId } = req.body;
  console.log(`[${new Date().toISOString()}] Received request for userId:`, userId);

  if (!userId) {
    console.error(`[${new Date().toISOString()}] Error: Missing userId in request body.`);
    return res.status(400).json({ error: 'Missing userId in request body. Please provide a userId.' });
  }

  try {
    // Step 1: Fetch journals from Supabase for the given userId
    // With the service_role key, this query will bypass RLS and should now fetch the data.
    console.log(`[${new Date().toISOString()}] Attempting to fetch journals for userId: ${userId} from Supabase using SERVICE ROLE KEY.`);
    const { data: journals, error } = await supabase
      .from('journals')
      .select('content,reflection,user_id') // Added user_id to select for debugging
      .eq('user_id', userId);

    if (error) {
      console.error(`[${new Date().toISOString()}] Supabase fetch error:`, error.message, error.details);
      return res.status(500).json({
        error: 'Failed to retrieve journals from the database.',
        details: error.message,
      });
    }

    console.log(`[${new Date().toISOString()}] Fetched ${journals ? journals.length : 0} journals from Supabase.`);
    console.log("Raw Journals Data:", JSON.stringify(journals, null, 2)); // Keep this for now to confirm data

    // Step 2: Filter journals to include only those with non-empty reflections
    const filteredJournals = journals.filter(j => j.reflection && typeof j.reflection === 'string' && j.reflection.trim() !== '');
    console.log(`[${new Date().toISOString()}] Filtered down to ${filteredJournals.length} journals with non-empty reflections.`);
    console.log("Filtered Journals (truncated):", JSON.stringify(filteredJournals.map(j => ({ userId: j.user_id, reflection: j.reflection ? j.reflection.substring(0, 50) + '...' : 'N/A' })), null, 2));


    if (filteredJournals.length === 0) {
      console.log(`[${new Date().toISOString()}] No meaningful reflections found for userId: ${userId}.`);
      return res.json({
        articles: [],
        videos: [],
        books: [],
        message: "No reflections found in your journals. Please add more detailed reflections to get personalized resources!",
      });
    }

    // Step 3: Construct the context string for the AI model
    const context = filteredJournals
      .map((j, index) => `Journal Entry ${index + 1}:\nContent: ${j.content}\nReflection: ${j.reflection}`)
      .join('\n\n---\n\n');
    console.log(`[${new Date().toISOString()}] Generated AI context string. Length: ${context.length} characters.`);
    // console.log("AI Context (truncated):", context.substring(0, 500) + (context.length > 500 ? '...' : ''));

    // Step 4: Initialize the Generative AI model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Step 5: Define the prompt for the AI model
    const prompt = `
      You are an AI assistant specialized in providing personalized learning resources.
      Based on the following journal entries and the lessons derived from them,
      suggest 3-5 helpful articles, 3-5 helpful videos, and 3-5 helpful books.
      Each suggestion should include a "title" and a working "url".
      Leverage comprehensive search capabilities to find the most relevant and high-quality resources.

      Journal Entries and Lessons:
      ${context}

      Respond ONLY as valid JSON. Ensure all URLs are full and valid.
      Example Format:
      {
        "articles": [
          {"title": "Article Title 1", "url": "https://example.com/article1"},
          {"title": "Article Title 2", "url": "https://example.com/article2"}
        ],
        "videos": [
          {"title": "Video Title 1", "url": "https://youtube.com/video1"},
          {"title": "Video Title 2", "url": "https://vimeo.com/video2"}
        ],
        "books": [
          {"title": "Book Title 1", "url": "https://amazon.com/book1"},
          {"title": "Book Title 2", "url": "https://goodreads.com/book2"}
        ]
      }
    `;
    console.log(`[${new Date().toISOString()}] Generated AI prompt. Length: ${prompt.length} characters.`);
    // console.log("AI Prompt (truncated):", prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''));

    // Step 6: Call the Generative AI model
    console.log(`[${new Date().toISOString()}] Calling Google Generative AI model...`);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
      tools: [{ googleSearch: {} }]
    });

    const responseText = result.response.text();
    console.log(`[${new Date().toISOString()}] AI response received. Length: ${responseText.length} characters.`);
    console.log("Raw AI Response Text:", responseText);

    // Step 7: Parse the AI's response as JSON
    let parsedResources;
    try {
      parsedResources = JSON.parse(responseText);
      console.log(`[${new Date().toISOString()}] Successfully parsed AI response.`);
      // console.log("Parsed AI Resources:", JSON.stringify(parsedResources, null, 2));
    } catch (parseError) {
      console.error(`[${new Date().toISOString()}] Error parsing AI response JSON:`, parseError.message);
      console.error("AI Response Text that failed to parse:", responseText);
      return res.status(500).json({
        error: "Failed to parse AI response. AI might have returned invalid JSON.",
        rawAiResponse: responseText,
        parseError: parseError.message,
      });
    }

    const articles = Array.isArray(parsedResources.articles) ? parsedResources.articles : [];
    const videos = Array.isArray(parsedResources.videos) ? parsedResources.videos : [];
    const books = Array.isArray(parsedResources.books) ? parsedResources.books : [];

    res.json({
      articles,
      videos,
      books,
      message: articles.length || videos.length || books.length
        ? "Here are some personalized resources based on your reflections."
        : "The AI did not find specific resources, but your reflections have been processed.",
    });
    console.log(`[${new Date().toISOString()}] Successfully sent resources to client.`);

  } catch (err) {
    console.error(`[${new Date().toISOString()}] Unhandled error in handler:`, err);
    return res.status(500).json({
      error: 'An unexpected error occurred while generating resources.',
      details: err.message,
    });
  }
}
