/**
 * Netlify function to act as a proxy for the Gemini API chat completions.
 * This function is for the CHATBOT.
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

    const chatHistory = requestBody.history;
    if (!chatHistory || !Array.isArray(chatHistory)) {
        return { statusCode: 400, body: 'Missing or invalid "history" in request body.' };
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const aiPersonaContext = `You are an expert AI assistant for 'Asif Digital', a digital marketing agency in Sharjah, UAE, run by Asif Khan. Be concise and friendly.
    - **Services**: AI-powered marketing, Social Media, SEO, WhatsApp Chatbots, Web Design.
    - **Locations Served**: Sharjah, Dubai, Ajman, and all over UAE.
    - **Contact**: Phone/WhatsApp is +971 54 586 6094.
    - **Owner**: Asif Khan, a specialist with 5+ years of experience.
    Your goal is to answer questions and encourage users to contact Asif for a free consultation.`;

    const payload = {
        contents: chatHistory,
        systemInstruction: {
            parts: [{ text: aiPersonaContext }]
        },
        generationConfig: {
            temperature: 0.7,
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

        const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Sorry, I couldn't get a response. Please try again.";
        return {
            statusCode: 200,
            body: JSON.stringify({ response: aiResponseText })
        };

    } catch (error) {
        console.error('Proxy function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error.' })
        };
    }
};

