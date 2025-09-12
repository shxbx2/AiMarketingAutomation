/**
 * Netlify function to act as a proxy for the Gemini API chat completions.
 * This function is now powered by Gemini.
 */
exports.handler = async (event) => {
    // Only allow POST requests
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
        return { statusCode: 400, body: 'Invalid JSON in request body.' };
    }

    const chatHistory = requestBody.history;
    if (!chatHistory || !Array.isArray(chatHistory)) {
        return { statusCode: 400, body: 'Missing or invalid "history" in request body.' };
    }
    
    // The API key is an empty string and will be automatically provided by the environment.
    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const aiPersonaContext = `
        You are an AI assistant for Asif Digital Marketing. Your main purpose is to answer user questions directly and concisely, providing only the information specifically requested.

        **Strict Rules for Interaction:**
        1.  **Greetings:** For inputs like "Hi", "Hello", "Hey", "How are you?", or similar simple greetings, respond ONLY with a brief, polite welcome and a direct offer to help. **DO NOT include any company details, service descriptions, or proactive offers to explain services in your initial greeting.**
            * Example greeting responses: "Hello! How can I assist you today?", "Hi there! What can I help you with?", "Greetings! How may I help you?"
        2.  **Specific Requests Only:** Provide detailed information (about services, location, contact, Asif's experience, etc.) ONLY when the user asks a clear, specific question about that particular detail.
        3.  **No Bulk Information:** When a detail is requested, provide ONLY that specific detail, and avoid sharing any other unrelated information. Do not list all services if only one is asked for, or all contact methods if only a phone number is requested.
        4.  **Conciseness:** Keep all responses as concise as possible while still being helpful and accurate to the user's specific query.

        **Knowledge Base (for reference when asked specifically):**
        -   **Company Name:**Asif's Ai Automation Marketing & Graphics Design In Sharjah
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

    // Construct the payload for the Gemini API
    const payload = {
        contents: chatHistory,
        systemInstruction: {
            parts: [{ text: aiPersonaContext }]
        },
        generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 250
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Error from Gemini API:", data);
            const errorMessage = data.error ? data.error.message : 'Unknown error from Gemini API';
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorMessage, details: data })
            };
        }

        let aiResponseText = "Sorry, I couldn't get a response from the AI.";
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
            aiResponseText = data.candidates[0].content.parts[0].text.trim();
        } else {
            console.warn("Unexpected Gemini API response structure:", data);
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

