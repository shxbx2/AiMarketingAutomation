/**
 * Netlify Function: content-generator.js
 * This function powers the "Content Idea Generator" tool.
 * It takes a business/industry type from the user, creates a specialized prompt for Gemini Pro,
 * and returns creative social media post ideas.
 */
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!event.body) {
        return { statusCode: 400, body: 'Request body is missing.' };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, body: 'Invalid JSON.' };
    }

    const industry = requestBody.industry;
    if (!industry) {
        return { statusCode: 400, body: 'Missing "industry" in request body.' };
    }

    // Securely get the API Key from Netlify Environment Variables
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "API key is not set." }) };
    }

    const openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";
    const modelId = "google/gemini-pro";

    const systemPrompt = `
        You are a creative social media marketing expert for businesses in the UAE.
        Generate 5 unique and engaging social media post ideas for a client in the following industry: "${industry}".
        For each idea, specify the platform (e.g., Instagram Reel, Facebook Post, TikTok Video) and provide a catchy caption.
        Format the output clearly and professionally with headings for each idea.
    `;

    const payload = {
        model: modelId,
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.7,
        max_tokens: 500
    };

    try {
        const response = await fetch(openRouterApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': 'https://aimarketingautomations.netlify.app/',
                'X-Title': 'Asif Content Generator'
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Error from OpenRouter:", data);
            return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || 'API Error' }) };
        }

        const ideas = data.choices[0]?.message?.content.trim() || "Sorry, I couldn't generate ideas right now.";
        return { statusCode: 200, body: JSON.stringify({ ideas: ideas }) };

    } catch (error) {
        console.error('Function error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};

