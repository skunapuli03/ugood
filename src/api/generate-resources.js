import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
dotenv.config();

// Initialize Google Generative AI with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Initialize Supabase client with your project URL and public key
// Ensure these keys are correctly set in your environment variables for production
// For Vercel, you'd configure these as environment variables in the project settings
const supabaseUrl = process.env.SUPABASE_URL || "https://ggksgziwgftlyfngtolu.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// The main handler for your API endpoint
export default async function handler(req, res) {
  // Log the incoming request method for debugging
  console.log(`[${new Date().toISOString()}] Handler called with method:`, req.method);

  // Ensure the request is a POST request, as we expect userId in the body
  if (req.method !== 'POST') {
    console.warn(`[${new Date().toISOString()}] Method Not Allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method Not Allowed. Please use POST.' });
  }

  // Extract userId from the request body
  const { userId } = req.body;
  console.log(`[${new Date().toISOString()}] Received request for userId:`, userId);

  // Validate userId presence
  if (!userId) {
    console.error(`[${new Date().toISOString()}] Error: Missing userId in request body.`);
    return res.status(400).json({ error: 'Missing userId in request body. Please provide a userId.' });
  }

  try {
    // Step 1: Fetch journals from Supabase for the given userId
    console.log(`[${new Date().toISOString()}] Attempting to fetch journals for userId: ${userId} from Supabase.`);
    const { data: journals, error } = await supabase
      .from('journals')
      .select('content,reflection') // Select both content and reflection fields
      .eq('user_id', userId); // Filter by the provided user_id

    // Handle Supabase fetch errors
    if (error) {
      console.error(`[${new Date().toISOString()}] Supabase fetch error:`, error.message, error.details);
      // It's good to provide a more user-friendly message for internal errors
      return res.status(500).json({
        error: 'Failed to retrieve journals from the database.',
        details: error.message,
      });
    }

    // Log the raw journals data fetched
    console.log(`[${new Date().toISOString()}] Fetched ${journals ? journals.length : 0} journals from Supabase.`);
    console.log("Raw Journals Data:", JSON.stringify(journals, null, 2)); // Uncomment for full raw data inspection

    // Step 2: Filter journals to include only those with non-empty reflections
    const filteredJournals = journals.filter(j => j.reflection && j.reflection.trim() !== '');
    console.log(`[${new Date().toISOString()}] Filtered down to ${filteredJournals.length} journals with non-empty reflections.`);
    console.log("Filtered Journals:", JSON.stringify(filteredJournals, null, 2)); // Uncomment for full filtered data inspection

    // If no reflections are found after filtering, return a specific message
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
    // This combines the content and reflection from each relevant journal entry
    const context = filteredJournals
      .map((j, index) => `Journal Entry ${index + 1}:\nContent: ${j.content}\nReflection: ${j.reflection}`)
      .join('\n\n---\n\n'); // Use a clear separator for multiple entries
    console.log(`[${new Date().toISOString()}] Generated AI context string. Length: ${context.length} characters.`);
    console.log("AI Context (truncated):", context.substring(0, 500) + (context.length > 500 ? '...' : '')); // Log truncated context for readability

    // Step 4: Initialize the Generative AI model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Consider 'gemini-2.0-pro' for potentially higher quality

    // Step 5: Define the prompt for the AI model
    // The prompt explicitly asks for JSON output with specific fields
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
    console.log("AI Prompt (truncated):", prompt.substring(0, 500) + (prompt.length > 500 ? '...' : '')); // Log truncated prompt

    // Step 6: Call the Generative AI model
    // We explicitly set responseMimeType to "application/json" for better structured output
    // And enable googleSearch tool for the model to find relevant links
    console.log(`[${new Date().toISOString()}] Calling Google Generative AI model...`);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json", // Instructs the model to output JSON directly
      },
      tools: [{ googleSearch: {} }] // Enable Google Search for the model
    });

    const responseText = result.response.text();
    console.log(`[${new Date().toISOString()}] AI response received. Length: ${responseText.length} characters.`);
    console.log("Raw AI Response Text:", responseText); // Log the full raw AI response

    // Step 7: Parse the AI's response as JSON
    let parsedResources;
    try {
      parsedResources = JSON.parse(responseText);
      console.log(`[${new Date().toISOString()}] Successfully parsed AI response.`);
      console.log("Parsed AI Resources:", JSON.stringify(parsedResources, null, 2)); // Log parsed object
    } catch (parseError) {
      console.error(`[${new Date().toISOString()}] Error parsing AI response JSON:`, parseError.message);
      console.error("AI Response Text that failed to parse:", responseText); // Log the problematic text
      return res.status(500).json({
        error: "Failed to parse AI response. AI might have returned invalid JSON.",
        rawAiResponse: responseText, // Include raw response for debugging
        parseError: parseError.message,
      });
    }

    // Step 8: Ensure the parsed response has the expected structure and default to empty arrays if not present
    const articles = Array.isArray(parsedResources.articles) ? parsedResources.articles : [];
    const videos = Array.isArray(parsedResources.videos) ? parsedResources.videos : [];
    const books = Array.isArray(parsedResources.books) ? parsedResources.books : [];

    // Final response to the client
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
    // Catch-all for any unexpected errors during the process
    console.error(`[${new Date().toISOString()}] Unhandled error in handler:`, err);
    return res.status(500).json({
      error: 'An unexpected error occurred while generating resources.',
      details: err.message,
      // In development, you might want to send the stack for more details
      // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}
