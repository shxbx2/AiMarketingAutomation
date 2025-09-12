/**
 * Netlify function for the AI Social Post Generator.
 * This is the correct file for the "Generator" on your website.
 * It securely reads the API key from Netlify's environment variables.
 */
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY is not set in Netlify. Please add it in your site configuration." }) };
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
    
    // This prompt is specifically for SOCIAL MEDIA POSTS
    const systemPrompt = "You are an expert social media manager for businesses in the UAE. Your task is to generate a short, engaging, and professional social media post (for platforms like Instagram or Facebook) based on the user's topic. The post should be concise (2-4 sentences), include relevant emojis, and end with 3-5 relevant hashtags (e.g., #Dubai #Sharjah #UAEMarketing). Do not use any markdown formatting like asterisks.";
    const userQuery = `Generate a social media post about: "${topic}"`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Error from Gemini API:", data);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: data.error ? data.error.message : 'Unknown API error.' })
            };
        }

        const generatedPost = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Sorry, I couldn't generate a post. Please try again.";
        
        // ** THE FIX IS HERE: This returns a 'post' object, which your website expects. **
        return {
            statusCode: 200,
            body: JSON.stringify({ post: generatedPost })
        };

    } catch (error) {
        console.error('Proxy function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error.' })
        };
    }
};

