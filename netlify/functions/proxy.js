exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Ensure the request body exists
    if (!event.body) {
        return { statusCode: 400, body: 'Request body is missing.' };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, body: 'Invalid JSON in request body.' };
    }

    // Extract the user message from the request body
    const userMessage = requestBody.message;
    if (!userMessage) {
        return { statusCode: 400, body: 'Missing "message" in request body.' };
    }

    // Get the OpenRouter API Key from Netlify Environment Variables
    const openRouterApiKey = process.env.OPENROUTER_API_KEY; // NEW ENVIRONMENT VARIABLE NAME

    if (!openRouterApiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "OPENROUTER_API_KEY environment variable is not set." }) };
    }

    // OpenRouter API endpoint (compatible with OpenAI's Chat Completions API)
    const openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";

    // Choose the model that was working for you
    const modelId = "mistralai/mistral-7b-instruct-v0.2"; // Confirmed model ID from your working code

    // Define a more concise AI persona context and explicit instruction for brevity
    const aiPersonaContext = `
        You are an AI assistant for Asif Digital Marketing.
        Your main goal is to answer questions concisely and directly.
        Only provide detailed information about services, Asif's experience, or contact details if the user explicitly asks for them.
        For general questions like "who are you" or "what do you do", provide a very brief summary.

        Company Name: Asif Digital Marketing
        Location: UAE (Sharjah, Dubai, Abu Dhabi, Ajman, Ras Al Khaimah)
        Owner/Expert: Asif (freelance digital marketer specializing in AI solutions, 5+ years experience, Google Ads Certified, Meta Blueprint Certified)
        Core Services: WhatsApp Chatbots & Automation, Social Media Content & Ads, AI-Powered Lead Follow-up, Local SEO & Google Ads, AI Content Generation, Predictive Analytics & Personalization, Intelligent Marketing Automation, AI-Driven Customer Segmentation.
        Contact: +971 54 586 6094, asifk199707@gmail.com, Muwailih Commercial, Sharjah, UAE.
    `;

    // Construct the payload for OpenRouter (OpenAI-compatible format)
    const payload = {
        model: modelId,
        messages: [
            { role: "system", content: aiPersonaContext }, // System message for persona and context
            { role: "user", content: userMessage }
        ],
        temperature: 0.5, // Slightly lower temperature for more direct responses
        max_tokens: 80 // Reduced max tokens for general responses
    };

    try {
        const response = await fetch(openRouterApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': 'https://aimarketingautomations.netlify.app/', // Your actual Netlify domain
                'X-Title': 'Asif Digital Marketing Chatbot' // Custom title for OpenRouter logs
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        // Check for errors from the OpenRouter API
        if (!response.ok) {
            console.error("Error from OpenRouter API:", data);
            const errorMessage = data.error ? data.error.message : 'Unknown error from OpenRouter API';
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: errorMessage,
                    details: data
                })
            };
        }

        let aiResponseText = "Sorry, I couldn't get a response from the AI.";
        // OpenRouter responses follow OpenAI's chat completions format
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
            aiResponseText = data.choices[0].message.content.trim(); // Trim whitespace
        } else {
            console.warn("Unexpected OpenRouter API response structure:", data);
            aiResponseText = "AI did not provide a text response in the expected format from OpenRouter.";
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ response: aiResponseText })
        };

    } catch (error) {
        console.error('Proxy function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error in proxy function', details: error.message })
        };
    }
};
