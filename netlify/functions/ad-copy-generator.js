 /**
 * Netlify function for an AI Ad Copy Generator.
 * This is a separate, unused feature.
 * This version is corrected to work on Netlify.
 */
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY is not set in Netlify." }) };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, body: 'Invalid JSON.' };
    }

    const topic = requestBody.topic;
    if (!topic) {
        return { statusCode: 400, body: 'Missing "topic" in request body.' };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    const systemPrompt = "You are an expert copywriter specializing in high-converting ad copy for platforms like Google Ads and Facebook Ads. Generate a compelling headline and a short, punchy ad description based on the user's topic. Format the response as: **Headline:** [Your Headline] **Description:** [Your Description]";
    const userQuery = `Generate ad copy for: "${topic}"`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.8, maxOutputTokens: 150 }
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
            return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || 'API Error' }) };
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

