import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai"; // Import the GoogleGenerativeAI package

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Initialize GoogleGenerativeAI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.post('/generate-reflection', async (req, res) => {
    const { journalEntry } = req.body; // Get the journal entry from the request body
    try {
        // Use the Gemini API to generate content from the journal entry
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`What can I learn, and improve upon from this journal-entry, be a helpful friend and therapist, provide solutions to the problem and if no problem, provide suggestions to be better, response has to be within 4 sentences: ${journalEntry}`);

        res.json({ reflection: result.response.text() }); // Send the reflection back to the client
    
    } catch (error) {
        console.error('Error generating reflection with Gemini:', error);
        res.status(500).json({ error: 'Failed to generate reflection using Gemini' });
    }
});

export default (req, res) => {
    app(req, res);  // Calls the Express app to handle the request
};
