// pages/api/generate-reflection.js

console.log("Starting generate-reflections.js"); //this is to let us know that server is working


import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize GoogleGenerativeAI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { journalEntry } = req.body;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(`What can I learn, and improve upon from this journal-entry, be a helpful friend and therapist, provide solutions to the problem and if no problem, provide suggestions to be better, response has to be within 4 sentences: ${journalEntry}`);

      res.status(200).json({ reflection: result.response.text() });
    } catch (error) {
      console.error('Error generating reflection with Gemini:', error);
      res.status(500).json({ error: 'Failed to generate reflection using Gemini' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
