// netlify/functions/proxy.js

// Using 'node-fetch' for robust server-side requests.
// Make sure to add it to your package.json by running: npm install node-fetch
const fetch = require('node-fetch');

exports.handler = async (event) => {
    // 1. Ensure the request is a POST request
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Ensure the request has a body
    if (!event.body) {
        return { statusCode: 400, body: 'Request body is missing.' };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        // If the body isn't valid JSON, return an error
        return { statusCode: 400, body: 'Invalid JSON in request body.' };
    }

    const userMessage = requestBody.message;
    if (!userMessage) {
        return { statusCode: 400, body: 'Missing "message" in request body.' };
    }

    // 3. Securely get the API token from Netlify environment variables
    const huggingFaceApiToken = process.env.HUGGING_FACE_API_TOKEN;
    if (!huggingFaceApiToken) {
        console.error("HUGGING_FACE_API_TOKEN is not set in Netlify environment variables.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error: API token is missing." }) };
    }

    // 4. Use a reliable conversational model.
    // 'microsoft/DialoGPT-medium' is a good free choice for chatbots.
    const modelId = "microsoft/DialoGPT-medium";
    const hfApiUrl = `https://api-inference.huggingface.co/models/${modelId}`;

    try {
        const response = await fetch(hfApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${huggingFaceApiToken}`
            },
            body: JSON.stringify({
                inputs: userMessage,
                parameters: {
                    max_new_tokens: 150, // Increased for better responses
                    temperature: 0.8,
                    do_sample: true
                },
                options: {
                    wait_for_model: true // Important for models that might be loading
                }
            })
        });

        // 5. **THE CRITICAL FIX**: Check the response content type before parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const result = await response.json();

            // Handle Hugging Face's specific error format
            if (result.error) {
                console.error("Error from Hugging Face API:", result.error);
                return {
                    statusCode: 502, // Bad Gateway - indicates an issue with the upstream API
                    body: JSON.stringify({ error: `AI model error: ${result.error}` })
                };
            }

            // Extract the generated text
            let aiResponseText = "Sorry, I couldn't formulate a response.";
            if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
                aiResponseText = result[0].generated_text;
            } else if (result.generated_text) { // Some models might return a single object
                 aiResponseText = result.generated_text;
            }


            return {
                statusCode: 200,
                body: JSON.stringify({ response: aiResponseText })
            };

        } else {
            // If the response is NOT JSON, it's likely a plain text error from Hugging Face
            const errorText = await response.text();
            console.error("Non-JSON response from Hugging Face:", errorText);
            return {
                statusCode: 502, // Bad Gateway
                body: JSON.stringify({ error: `The AI service returned an unexpected error: ${errorText}` })
            };
        }

    } catch (error) {
        console.error('Proxy function execution error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error in proxy function.', details: error.message })
        };
    }
};
