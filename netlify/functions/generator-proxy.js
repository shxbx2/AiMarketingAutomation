const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Get the API Key from Netlify Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY environment variable is not set." }) };
    }

    try {
        const requestBody = JSON.parse(event.body);
        const topic = requestBody.topic;

        if (!topic) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing "topic" in request body.' }) };
        }
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

        // --- SEO UPDATE: Detailed System Instruction for better, more reliable output ---
        const systemInstruction = {
            role: "system",
            parts: [{ text: `You are an expert social media manager for businesses in the UAE. Your task is to generate a single, engaging social media post based on a given topic.

            **Strict Rules:**
            1.  **Format:** The post must be a single block of text. Do NOT use any Markdown (like asterisks for bold).
            2.  **Content:** Include relevant, popular, and local hashtags (e.g., #Dubai, #Sharjah, #UAELife).
            3.  **Tone:** The tone should be upbeat, professional, and promotional. Use relevant emojis to make it visually appealing.
            4.  **Language:** Generate the post in English.
            5.  **Output:** Your entire response must ONLY be the social media post itself. Do not add any introductory phrases like "Here is the post:" or any other conversational text. Just the post content.
            
            Example Topic: Summer sale for a Dubai fashion store
            Example Output:
            🔥 BIGGEST SUMMER SALE is ON! 🔥 Beat the heat with sizzling hot deals at our Dubai store. Get up to 50% off on all summer collections! 👗🕶️ Don't miss out! #DubaiFashion #SummerSale #DubaiDeals #UAEShopping #FashionistaDXB`
            }],
        };

        const chat = model.startChat({
            history: [systemInstruction],
            generationConfig: {
                maxOutputTokens: 200,
            },
        });

        const result = await chat.sendMessage(topic);
        const response = await result.response;
        const postText = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ post: postText.trim() })
        };

    } catch (error) {
        console.error('Error in generator-proxy function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};

