import express from 'express';
import OpenAI from 'openai';

const app = express();
const port = 5000;

//intialize the openai api
 const openai = new OpenAI({ apiKey: 'api-key' });

app.post('/generate-text', async (req, res) => {
    const{journalEntry} = req.body;

    try {
        // Make the request to OpenAI
        const completion = await openai.chat.completions.create({
          model: 'gpt-4', // Use the desired model (GPT-4 in this case)
          messages: [
            {
              role: 'user',
              content: `Reflect on this journal entry: "${journalEntry}"`, // Use the journal entry as input for reflection
            },
          ],
        });
    
        // Send back the response from OpenAI
        const reflection = completion.choices[0].message.content;
        res.json({ reflection }); // Send reflection back to frontend
    
      } catch (error) {
        console.error('Error with OpenAI API:', error);
        res.status(500).json({ error: 'Something went wrong' });
      }
    });
    
    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
