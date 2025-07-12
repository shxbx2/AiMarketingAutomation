// netlify/functions/proxy.js
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
        return { statusCode: 400, body: 'Invalid JSON in request body.' };
    }

    const userMessage = requestBody.message;
    if (!userMessage) {
        return { statusCode: 400, body: 'Missing "message" in request body.' };
    }

    const huggingFaceApiToken = process.env.HUGGING_FACE_API_TOKEN;

    if (!huggingFaceApiToken) {
        return { statusCode: 500, body: JSON.stringify({ error: "HUGGING_FACE_API_TOKEN environment variable is not set." }) };
    }

    // UPDATED: Using the general Hugging Face Inference API endpoint.
    // The model ID will now be sent in the request body.
    const hfApiUrl = `https://api-inference.huggingface.co/models/moonshotai/Kimi-K2-Instruct`; // Direct model endpoint

    try {
        const response = await fetch(hfApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${huggingFaceApiToken}`
            },
            body: JSON.stringify({
                // The 'inputs' field contains the text to be processed by the model.
                inputs: userMessage,
                // These parameters control the text generation.
                parameters: {
                    max_new_tokens: 100, // Maximum number of tokens to generate
                    temperature: 0.7,    // Controls randomness (higher = more random)
                    do_sample: true      // Whether to sample (true for creative text)
                },
                // Optional: You can add options like wait_for_model or use_cache
                options: {
                    wait_for_model: true // Ensures the model is loaded before responding
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Error from Hugging Face API:", result);
            // Check for specific Hugging Face error structures
            const errorMessage = result.error || (result.errors && result.errors.length > 0 ? result.errors[0] : 'Unknown error from Hugging Face API');
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: errorMessage,
                    details: result
                })
            };
        }

        let aiResponseText = "Sorry, I couldn't get a response from the AI.";
        if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
            aiResponseText = result[0].generated_text;
        } else {
            console.warn("Unexpected Hugging Face API response structure:", result);
            aiResponseText = "AI did not provide a text response in the expected format from Hugging Face.";
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
