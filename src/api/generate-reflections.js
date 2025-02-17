import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

console.log("Starting generate-reflections.js");

dotenv.config();

// Initialize GoogleGenerativeAI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { journalEntry } = req.body;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Generate the reflection (lesson)
      const reflectionResult = await model.generateContent(
        `What can I learn, and improve upon from this journal-entry, be a helpful friend and therapist, provide solutions to the problem and if no problem, provide suggestions to be better, response has to be within 4 sentences: ${journalEntry}`
      );  
      
      const reflection = reflectionResult.response.text();
      
      // Generate tasks based on the reflection (lesson)
      const tasksResult = await model.generateContent(
        `Based on the following lesson, list tasks that can help achieve the goals mentioned: ${reflection}`
      );
      
      const tasksText = tasksResult.response.text();
      const taskList = tasksText
        .split('\n')
        .slice(0, 5)
        .map(task => task.replace(/^\*\*.*?\*\*:/, '').trim());
      
      res.status(200).json({ reflection, taskList });
    } catch (error) {
      console.error('Error generating reflection or tasks with Gemini:', error);
      res.status(500).json({
        error: 'Failed to generate reflection or tasks using Gemini',
        details: error.message,
      });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}