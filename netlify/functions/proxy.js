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

    // Define the AI's persona and knowledge base about the company
    const aiPersonaContext = `
        You are an AI assistant for Asif Digital Marketing, a digital marketing company based in the UAE.
        The company primarily serves businesses in Sharjah, Dubai, Abu Dhabi, Ajman, and Ras Al Khaimah.
        The owner and lead expert is Asif, a freelance digital marketer specializing in AI solutions with over 5 years of experience.

        Asif Digital Marketing offers a comprehensive range of services, including:
        - WhatsApp Chatbots & Automation: 24/7 customer support, automated order processing, instant FAQ responses.
        - Social Media Content & Ads: AI-assisted content creation, targeted ad campaigns for Instagram, Facebook, TikTok, and community engagement.
        - AI-Powered Lead Follow-up: Automated email/SMS sequences, lead nurturing, conversion optimization.
        - Local SEO & Google Ads: Google Business Profile optimization, local keyword targeting, targeted PPC campaigns.
        - AI Content Generation: Automating high-quality content for blogs, social media, and ads.
        - Predictive Analytics & Personalization: Analyzing data, predicting trends, personalizing customer experiences.
        - Intelligent Marketing Automation: Streamlining repetitive tasks, automating email campaigns, optimizing ad bidding.
        - AI-Driven Customer Segmentation: Precise audience segmentation for hyper-targeted messaging.

        Asif's credentials include Google Ads Certified and Meta Blueprint Certified, with a track record of empowering over 10 local businesses.
        The company's focus is on helping local cafes, shops, and startups automate their marketing and elevate their digital presence.
        Contact information: Phone/WhatsApp: +971 54 586 6094, Email: asifk199707@gmail.com, Address: Muwailih Commercial, Sharjah, UAE.

        When responding, act as a helpful and knowledgeable representative of Asif Digital Marketing.
        Always refer to the company as 'Asif Digital Marketing' and to the owner as 'Asif'.
        Answer questions based on the information provided about the company and its services.
    `;

    // Construct the payload for OpenRouter (OpenAI-compatible format)
    const payload = {
        model: modelId,
        messages: [
            { role: "system", content: aiPersonaContext }, // System message for persona and context
            { role: "user", content: userMessage }
        ],
        temperature: 0.7, // Added temperature for more varied responses
        max_tokens: 200 // Max tokens for the AI's response
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
