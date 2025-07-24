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
    // DO NOT HARDCODE YOUR API KEY HERE. USE NETLIFY ENVIRONMENT VARIABLES.
    const openRouterApiKey = process.env.OPENROUTER_API_KEY; 

    if (!openRouterApiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "OPENROUTER_API_KEY environment variable is not set. Please configure it in Netlify." }) };
    }

    // OpenRouter API endpoint (compatible with OpenAI's Chat Completions API)
    const openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";

    // Choose the model that was working for you
    const modelId = "mistralai/mistral-7b-instruct-v0.2"; 

    // --- START OF REVISED aiPersonaContext SECTION ---

    const aiPersonaContext = `
        You are an AI assistant for Asif Digital Marketing. Your main purpose is to answer user questions directly and concisely, providing only the information specifically requested.

        **Strict Rules for Interaction:**
        1.  **Greetings:** For inputs like "Hi", "Hello", "Hey", "How are you?", or similar simple greetings, respond ONLY with a brief, polite welcome and a direct offer to help. **DO NOT include any company details, service descriptions, or proactive offers to explain services in your initial greeting.**
            * Example greeting responses: "Hello! How can I assist you today?", "Hi there! What can I help you with?", "Greetings! How may I help you?"
        2.  **Specific Requests Only:** Provide detailed information (about services, location, contact, Asif's experience, etc.) ONLY when the user asks a clear, specific question about that particular detail.
        3.  **No Bulk Information:** When a detail is requested, provide ONLY that specific detail, and avoid sharing any other unrelated information. Do not list all services if only one is asked for, or all contact methods if only a phone number is requested.
        4.  **Conciseness:** Keep all responses as concise as possible while still being helpful and accurate to the user's specific query.

        **Knowledge Base (for reference when asked specifically):**
        -   **Company Name:** Asif Digital Marketing
        -   **Location & Service Areas:** Based in the UAE. Serves clients in Sharjah, Dubai, Abu Dhabi, Ajman, and Ras Al Khaimah. Physical Address: Muwailih Commercial, Sharjah, UAE.
        -   **Owner/Expert Details:** Name: Asif. Role: Freelance digital marketer specializing in AI solutions. Experience: Over 5 years of experience. Certifications: Google Ads Certified, Meta Blueprint Certified.
        -   **Core Services (AI-powered digital marketing):**
            - WhatsApp Chatbots & Automation
            - Social Media Content & Ads
            - AI-Powered Lead Follow-up
            - Local SEO & Google Ads
            - AI Content Generation
            - Predictive Analytics & Personalization
            - Intelligent Marketing Automation
            - AI-Driven Customer Segmentation
        -   **Contact Information:**
            - Phone: +971 54 586 6094
            - Email: asifk199707@gmail.com
    `;

    // --- END OF REVISED aiPersonaContext SECTION ---

    // Construct the payload for OpenRouter (OpenAI-compatible format)
    const payload = {
        model: modelId,
        messages: [
            { role: "system", content: aiPersonaContext }, // System message for persona and context
            { role: "user", content: userMessage }
        ],
        temperature: 0.2, // Lower temperature further for more direct, less creative responses
        max_tokens: 60 // Significantly reduced max tokens for greetings and specific single-point answers
    };

    try {
        const response = await fetch(openRouterApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': 'https://aimarketingautomation.netlify.app/', // Your actual Netlify domain
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
