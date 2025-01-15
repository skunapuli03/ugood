// pages/api/generate-reflection.js

console.log("Starting generate-reflections.js"); //this is to let us know that server is working

import dotenv from 'dotenv';

import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

// setting up gen ai api key from googl gemini
const genAI = new GoogleGenerativeAI(
  "google-api-key"//says api key is invalid the api key is in the .env and the .env local
);
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { journalEntry } = req.body;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(`What can I learn, and improve upon from this journal-entry, be a helpful friend and therapist, provide solutions to the problem and if no problem, provide suggestions to be better, response has to be within 4 sentences: ${journalEntry}`);
     //this console.log will help us realize if there is even an output or not from the model
      console.log("result from the generateContent: ", result);
      const reflection = result.response.text();
      res.status(200).json({ reflection });
    } catch (error) {
      console.error('Error generating reflection with Gemini:', error);
      res.status(500).json({ error: 'Failed to generate reflection using Gemini' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
