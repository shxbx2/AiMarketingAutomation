/**
 * Netlify function to act as a proxy for the Gemini API chat completions.
 * File Path: netlify/functions/proxy.js
 */
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

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

    const chatHistory = requestBody.history;
    if (!chatHistory || !Array.isArray(chatHistory)) {
        return { statusCode: 400, body: 'Missing or invalid "history" in request body.' };
    }
    
    // Corrected Model Name to gemini-1.5-flash
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const aiPersonaContext = `You are 'Sparky', the expert AI assistant for 'Asif Digital' in Sharjah, UAE. 
    Professional, friendly, and proactive. Goal: Encourage a free consultation with Asif Khan.
    Contact: +971 54 586 6094, Asifk199707@gmail.com. 
    Rules: Use plain text only (NO MARKDOWN/BOLDING).`;

    const payload = {
        contents: chatHistory,
        systemInstruction: { parts: [{ text: aiPersonaContext }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 350 }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || 'API Error' }) };
        }

        const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Sorry, I couldn't get a response.";
        return {
            statusCode: 200,
            body: JSON.stringify({ response: aiResponseText })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error.' }) };
    }
};
