// This function can be used to call OpenAI's API with fetch.
async function callOpenAIAPI(prompt) {
    try {
        const response = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`  // Make sure to replace this in production
            },
            body: JSON.stringify({
                model: "text-davinci-003",
                prompt: prompt,
                max_tokens: 100
            })
        });

        const data = await response.json();
        console.log(data.choices[0].text);
        return data.choices[0].text;

    } catch (error) {
        console.error('Error:', error);
    }
}
