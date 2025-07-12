// netlify/functions/proxy.js
// This function acts as a backend proxy to securely call the Hugging Face API.
// It retrieves the API token from Netlify's environment variables,
// preventing it from being exposed in your client-side code.

// IMPORTANT: Node.js 18+ (which Netlify uses for functions by default)
// includes a native global fetch API, so node-fetch is no longer strictly necessary.
// We can directly use `fetch` without requiring/importing an external module.

// The main handler function for your Netlify Function.
// 'event' contains information about the HTTP request (e.g., body, headers).
// 'context' contains information about the invocation, function, and deployment environment.
exports.handler = async (event, context) => {
    // 1. Get the Hugging Face API Token from Netlify Environment Variables
    //    IMPORTANT: You will set this environment variable in your Netlify dashboard, NOT in this code.
    const huggingFaceApiToken = process.env.HUGGING_FACE_API_TOKEN;

    // 2. Define the Hugging Face model ID (you can also pass this from the frontend if needed)
    const modelId = "moonshotai/Kimi-K2-Instruct"; // Your chosen model ID
    const apiUrl = `https://api-inference.huggingface.co/models/${modelId}`;

    // 3. Extract the user's message from the request body
    let userMessage;
    try {
        // Parse the request body to get the user's message.
        // The frontend will send a JSON payload like: { message: "Your query" }
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
            body: JSON.stringify({ error: "No message provided in the request." }),
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
        // 4. Make the request to the Hugging Face Inference API using native `fetch`
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${huggingFaceApiToken}` // Use the securely stored token
            },
            body: JSON.stringify({
                inputs: userMessage,
                // Parameters can vary by model. These are common for text generation.
                parameters: {
                    max_new_tokens: 100, // Maximum number of tokens to generate in the response
                    temperature: 0.7,    // Controls randomness (higher = more random)
                    do_sample: true      // Whether to sample from the distribution (true for creative text)
                }
            })
        });

        const result = await response.json(); // Parse the JSON response from Hugging Face

        // 5. Handle potential errors from Hugging Face API
        if (response.status !== 200) {
            console.error("Hugging Face API Error Response:", result);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: result.error || "Error from Hugging Face API" }),
            };
        }

        // 6. Send the AI's response back to the client
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
        // Catch any network errors or other exceptions during the fetch operation.
        console.error('Error in Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error while processing AI request." }),
        };
    }
};
