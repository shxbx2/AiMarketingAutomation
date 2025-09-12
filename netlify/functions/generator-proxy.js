/**
 * Netlify function for the AI Social Post Generator.
 * This function is powered by the Gemini API and reads the key from Netlify environment variables.
 */
exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    // IMPORTANT: Get the API key from Netlify's environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY is not set in Netlify." }) };
    }

    if (!event.body) {
        return { statusCode: 400, body: 'Request body is missing.' };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, body: 'Invalid JSON in request body.' };
    }

    const topic = requestBody.topic;
    if (!topic) {
        return { statusCode: 400, body: 'Missing "topic" in request body.' };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    const systemPrompt = "You are an expert social media manager for businesses in the UAE. Your task is to generate a short, engaging, and professional social media post (for platforms like Instagram or Facebook) based on the user's topic. The post should be concise (2-4 sentences), include relevant emojis, and end with 3-5 relevant hashtags (e.g., #Dubai #Sharjah #UAEMarketing).";
    const userQuery = `Generate a social media post about: "${topic}"`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Error from Gemini API:", data);
            const errorMessage = data.error ? data.error.message : 'Unknown error from Gemini API';
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorMessage })
            };
        }

        let generatedPost = "Sorry, I couldn't get a response from the AI.";
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            generatedPost = data.candidates[0].content.parts[0].text.trim();
        } else {
             console.warn("Unexpected Gemini API response structure:", data);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ post: generatedPost })
        };

    } catch (error) {
        console.error('Proxy function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};

