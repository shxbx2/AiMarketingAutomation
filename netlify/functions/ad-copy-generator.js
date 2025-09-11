/**
 * Netlify Function: ad-copy-generator
 * This function generates platform-specific advertising copy using the Gemini Pro model.
 * It's triggered by a POST request containing product details, target audience, and the ad platform.
 *
 * How to use:
 * 1. Place this file in the `/netlify/functions/` directory.
 * 2. The frontend will call this function at `/.netlify/functions/ad-copy-generator`.
 */
exports.handler = async (event) => {
    // 1. Validate the Request Method
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Parse the Incoming Data
    if (!event.body) {
        return { statusCode: 400, body: 'Request body is missing.' };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, body: 'Invalid JSON in request body.' };
    }

    // 3. Extract and Validate Input Fields
    const { product, audience, platform } = requestBody;
    if (!product || !audience || !platform) {
        return { statusCode: 400, body: 'Missing required fields: product, audience, and platform.' };
    }

    // 4. Securely Access the API Key
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "API key is not configured. Set OPENROUTER_API_KEY in Netlify." }) };
    }

    // 5. Define API and Model Configuration
    const openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";
    const modelId = "google/gemini-pro";

    // 6. Engineer the System Prompt for High-Quality Ad Copy
    // This is the core instruction given to the AI model.
    const systemPrompt = `
        You are an expert direct-response copywriter specializing in high-converting ads for the UAE market (Dubai, Sharjah, Abu Dhabi).
        Your task is to generate compelling ad copy for the following:
        - **Product/Service:** "${product}"
        - **Target Audience:** "${audience}"
        - **Ad Platform:** "${platform}"

        **Instructions:**
        - **For Google Ads:** Provide 3 distinct, catchy headlines (max 30 characters each) and 2 compelling descriptions (max 90 characters each).
        - **For Facebook/Instagram Ads:** Provide a persuasive "Primary Text" (2-3 short paragraphs), an attention-grabbing "Headline" (5-7 words), and a clear "Call to Action" suggestion (e.g., Learn More, Shop Now).
        - **Tone:** The copy must be persuasive, clear, and benefit-oriented.
        - **Localization:** Incorporate language and concepts that resonate with a UAE audience.
        - **Formatting:** Use Markdown for clear structure (e.g., headings, bold text, bullet points). Use emojis where appropriate for Facebook/Instagram.
    `;

    // 7. Construct the API Payload
    const payload = {
        model: modelId,
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.75, // Higher temperature for more creative and varied ad copy.
        max_tokens: 600    // Ample token limit for detailed ad copy.
    };

    // 8. Execute the API Call and Handle the Response
    try {
        const response = await fetch(openRouterApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': 'https://aimarketingautomations.netlify.app/',
                'X-Title': 'Asif Ad Copy Generator'
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Error from OpenRouter:", data);
            const errorMessage = data.error?.message || 'API Error';
            return { statusCode: response.status, body: JSON.stringify({ error: errorMessage }) };
        }

        const adCopy = data.choices[0]?.message?.content.trim() || "Sorry, I couldn't generate ad copy right now. Please try again.";

        return {
            statusCode: 200,
            body: JSON.stringify({ adCopy: adCopy })
        };

    } catch (error) {
        console.error('Netlify function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal server error occurred.' })
        };
    }
};
