/**
 * Netlify function for a simple Ad Copy Generator.
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
    
    const systemPrompt = "You are an expert advertising copywriter. Your task is to generate a compelling and short ad copy (Headline and Body) for the user's topic. The tone should be persuasive and professional. Do not use any markdown formatting like asterisks.";
    const userQuery = `Generate ad copy for: "${topic}"`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 250
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

        const adCopy = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Sorry, I couldn't generate ad copy. Please try again.";
        return {
            statusCode: 200,
            body: JSON.stringify({ ad_copy: adCopy })
        };

    } catch (error) {
        console.error('Proxy function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error.' })
        };
    }
};
