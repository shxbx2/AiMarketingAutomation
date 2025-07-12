// netlify/functions/proxy.js
exports.handler = async (event, context) => {
    const huggingFaceApiToken = process.env.HUGGING_FACE_API_TOKEN;
    const modelId = "moonshotai/Kimi-K2-Instruct";
    const apiUrl = `https://api-inference.huggingface.co/models/${modelId}`;

    let userMessage;
    try {
        const body = JSON.parse(event.body);
        userMessage = body.message;
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid request body. Expected JSON with 'message' field." }),
        };
    }

    if (!userMessage) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "No message provided." }),
        };
    }

    if (!huggingFaceApiToken) {
        console.error("HUGGING_FACE_API_TOKEN environment variable is not set.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server configuration error: API token missing. Please configure HUGGING_FACE_API_TOKEN in Netlify environment variables." }),
        };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${huggingFaceApiToken}`
            },
            body: JSON.stringify({
                inputs: userMessage,
                parameters: {
                    max_new_tokens: 100,
                    temperature: 0.7,
                    do_sample: true
                }
            })
        });

        const result = await response.json();

        if (response.status !== 200) {
            console.error("Hugging Face API Error Response:", result);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: result.error || "Error from Hugging Face API" }),
            };
        }

        let aiResponseText = "Sorry, I couldn't get a response from the AI.";
        if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
            aiResponseText = result[0].generated_text;
        } else {
            console.error("Unexpected Hugging Face API response structure:", result);
            aiResponseText = "Unexpected response from AI. Please try again.";
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ response: aiResponseText }),
        };

    } catch (error) {
        console.error('Error in Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error while processing AI request." }),
        };
    }
};
