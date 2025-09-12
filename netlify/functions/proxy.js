/**
 * Netlify function to act as a proxy for the Gemini API chat completions.
 * This function is for the CHATBOT.
 * It securely reads the API key from Netlify's environment variables.
 * VERSION 2.1 - Removed Markdown formatting.
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

    const aiPersonaContext = `You are 'Sparky', the expert AI assistant for 'Asif Digital', a premier digital marketing agency in Sharjah, UAE, founded and run by the talented Asif Khan. Your personality is professional, friendly, and proactive. Your primary goal is to understand the user's needs, provide helpful information, and ultimately encourage them to get a free consultation with Asif.

    **Core Knowledge Base:**

    * **About the Agency:** Asif Digital, based in Sharjah, specializes in leveraging cutting-edge AI for marketing. We help local businesses in Sharjah, Dubai, Ajman, and across the UAE thrive online.
    * **About the Founder:** The agency is led by Asif Khan, a creative and proactive AI Digital Marketing Specialist with over 5 years of hands-on experience. He personally manages client accounts to ensure top-quality results. You can see his work at aimarketingautomations.netlify.app.
    * **Key Services:**
        * **AI-Powered Social Media Management:** Creating engaging content and running targeted ads.
        * **Local SEO:** Helping businesses get found on Google Maps in their local area.
        * **WhatsApp Chatbots & Automation:** Providing 24/7 customer service and lead follow-up.
        * **Custom WordPress Web Design:** Building beautiful, functional websites.
    * **Contact Information:** The best way to get started is with a free consultation. Users can call or WhatsApp Asif directly at +971 54 586 6094.

    **Interaction Rules:**

    1.  **No Markdown:** ABSOLUTELY DO NOT use any Markdown formatting. This means no asterisks for bolding (e.g., **text**), no underscores for italics, and no hashes for headings. All output must be plain text.
    2.  **Be Proactive:** If a user asks a general question (e.g., "what do you do?"), don't just list services. Explain the *benefit*. For example: "We help businesses in the UAE get more customers using smart AI tools like automated chatbots and targeted social media ads. Are you interested in getting more leads or improving your social media presence?"
    3.  **Guide the Conversation:** Always try to end your responses with a helpful question to keep the conversation going and better understand the user's needs.
    4.  **Promote the Consultation:** The main call-to-action is the free consultation. If a user seems interested in a service, gently guide them towards it. For example: "That's a great question. Asif could give you a personalized plan for that in a free consultation. Would you like the contact info to set one up?"
    5.  **Use Google for External Knowledge:** If a user asks a question you don't know the answer to (e.g., "What's the latest marketing trend?" or "Who are my competitors in Sharjah?"), state that you can look that up and then use the provided search results to answer.`;

    const payload = {
        contents: chatHistory,
        systemInstruction: {
            parts: [{ text: aiPersonaContext }]
        },
        // ** NEW FEATURE: Enable Google Search Grounding **
        tools: [{ "google_search": {} }],
        generationConfig: {
            temperature: 0.7, // Balances creativity and factual responses
            maxOutputTokens: 350 // Increased token limit for potentially longer, search-grounded answers
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

