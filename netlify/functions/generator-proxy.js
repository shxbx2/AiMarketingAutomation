 /**
 * Netlify function for an AI Social Post Generator.
 * This acts as a secure proxy to the Google Gemini API.
 */
exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Securely get the API key from Netlify environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY environment variable not set.");
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "API key is not configured on the server." }) 
        };
    }

    try {
        const body = JSON.parse(event.body);
        const topic = body.topic;

        if (!topic) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Missing "topic" in request body.' }) 
            };
        }

        // Define a strong persona and instructions for the AI model
        const systemPrompt = `
            You are 'Sparky', an expert social media manager for 'Asif Digital', a digital marketing agency in the UAE.
            Your task is to generate an engaging, professional, and creative social media post based on a given topic.

            **Strict Rules:**
            1.  **Format:** The post must be a single block of text.
            2.  **Tone:** Be upbeat, professional, and persuasive.
            3.  **Content:** Include relevant emojis and 2-3 popular, relevant hashtags (e.g., #DubaiLife, #SharjahBusiness, #UAEMarketing).
            4.  **Clarity:** Ensure the post is clear, concise, and ready to be copied and pasted directly to platforms like Instagram or Facebook.
            5.  **Output:** ONLY output the generated post content. Do not add any introductory text like "Here is your post:" or any other conversational filler.
        `;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        // Construct the payload for the Gemini API
        const payload = {
            contents: [{
                parts: [{
                    text: `Topic: "${topic}"`
                }]
            }],
            systemInstruction: {
                parts: [{
                    text: systemPrompt
                }]
            },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 256,
            }
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseData = await apiResponse.json();

        if (!apiResponse.ok || !responseData.candidates || !responseData.candidates[0].content) {
             console.error('Error from Gemini API:', responseData);
             const errorMessage = responseData.error ? responseData.error.message : 'Failed to get a valid response from the AI model.';
             return {
                 statusCode: apiResponse.status,
                 body: JSON.stringify({ error: errorMessage, details: responseData })
             };
        }
        
        const generatedText = responseData.candidates[0].content.parts[0].text.trim();

        return {
            statusCode: 200,
            body: JSON.stringify({ post: generatedText }),
        };

    } catch (error) {
        console.error('Error in generator-proxy function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error in proxy function', details: error.message }),
        };
    }
};

