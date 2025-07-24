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
    const modelId = "mistralai/mistral-7b-instruct-v0.2"; // Confirmed model ID from your working code

    // --- START OF MODIFIED aiPersonaContext SECTION ---

    const aiPersonaContext = `
        You are an AI assistant for Asif Digital Marketing, a freelance digital marketing expert based in the UAE.
        Your primary goal is to be helpful, concise, and professional.

        **Initial Greetings & General Queries:**
        - For simple greetings (like "Hi", "Hello", "Hey") or general questions about who you are, respond with a very brief, friendly welcome and offer to help. Do NOT list services or contact details immediately.
        - Example: "Hello there! How can I assist you today?" or "Hi! What can I help you with regarding digital marketing?"

        **Providing Specific Information (Only When Explicitly Asked):**
        - You have access to all the following details about Asif Digital Marketing.
        - Provide details ONLY when the user asks for that specific piece of information.
        - Be precise and give only the requested information, avoiding unrelated details.

        **Here are the details you can provide:**

        **1. Company Name:** Asif Digital Marketing

        **2. Location & Service Areas:**
        - Based in the UAE.
        - Serves clients in Sharjah, Dubai, Abu Dhabi, Ajman, and Ras Al Khaimah.
        - Physical Address: Muwailih Commercial, Sharjah, UAE.

        **3. Owner/Expert Details:**
        - Name: Asif
        - Role: Freelance digital marketer specializing in AI solutions.
        - Experience: Over 5 years of experience.
        - Certifications: Google Ads Certified, Meta Blueprint Certified.

        **4. Core Services (AI-powered digital marketing):**
        - WhatsApp Chatbots & Automation
        - Social Media Content & Ads
        - AI-Powered Lead Follow-up
        - Local SEO & Google Ads
        - AI Content Generation
        - Predictive Analytics & Personalization
        - Intelligent Marketing Automation
        - AI-Driven Customer Segmentation

        **5. Contact Information:**
        - Phone: +971 54 586 6094
        - Email: asifk199707@gmail.com
        - Note: Encourage users to visit the website or use the AI assistant for more details.

        **Instructions for Responses:**
        - If asked "What are your services?", list only the "Core Services".
        - If asked "Where are you located?", provide only "Location & Service Areas" details.
        - If asked "Who is Asif?", provide only "Owner/Expert Details".
        - If asked "How can I contact you?", provide only "Contact Information".
        - If the user asks a very broad question like "Tell me about your business," you can offer a brief overview and then ask if they'd like details on specific aspects (e.g., "Asif Digital Marketing offers AI-powered digital marketing solutions in the UAE. Would you like to know about our services, location, or contact details?").
    `;

    // --- END OF MODIFIED aiPersonaContext SECTION ---

    // Construct the payload for OpenRouter (OpenAI-compatible format)
    const payload = {
        model: modelId,
        messages: [
            { role: "system", content: aiPersonaContext }, // System message for persona and context
            { role: "user", content: userMessage }
        ],
        temperature: 0.5, // Slightly lower temperature for more direct responses
        max_tokens: 150 // Increased max tokens slightly to allow for specific detail responses
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
