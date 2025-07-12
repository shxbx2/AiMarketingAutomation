
// netlify/functions/proxy.js
// This function acts as a backend proxy to securely call the Hugging Face API.
// It retrieves the API token from Netlify's environment variables,
// preventing it from being exposed in your client-side code.

const fetch = require('node-fetch'); // Required for making HTTP requests in Node.js environments

// The main handler function for your Netlify Function.
// 'event' contains information about the HTTP request (e.g., body, headers).
// 'context' contains information about the invocation, function, and deployment environment.
exports.handler = async (event, context) => {
    // IMPORTANT: The HUGGING_FACE_API_TOKEN must be set as an environment variable
    // in your Netlify dashboard settings for this site.
    const huggingFaceApiToken = process.env.HUGGING_FACE_API_TOKEN;

    // Define the Hugging Face model ID. This can also be passed from the frontend
    // if you want to allow dynamic model selection, but for now, it's fixed here.
    const modelId = "moonshotai/Kimi-K2-Instruct"; // Your chosen model ID
    const apiUrl = `https://api-inference.huggingface.co/models/${modelId}`;

    let userMessage;
    try {
        // Parse the request body to get the user's message.
        // The frontend will send a JSON payload like: { message: "Your query" }
        const body = JSON.parse(event.body);
        userMessage = body.message;
    } catch (error) {
        // If the request body is not valid JSON or missing the 'message' field,
        // return a 400 Bad Request error.
        console.error("Error parsing request body:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid request body. Expected JSON with 'message' field." }),
        };
    }

    // Validate that a message was actually provided.
    if (!userMessage) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "No message provided in the request." }),
        };
    }

    // Crucial security check: Ensure the API token is actually set.
    // If it's not, it means the Netlify environment variable wasn't configured correctly.
    if (!huggingFaceApiToken) {
        console.error("HUGGING_FACE_API_TOKEN environment variable is not set in Netlify.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server configuration error: API token missing. Please configure HUGGING_FACE_API_TOKEN in Netlify environment variables." }),
        };
    }

    try {
        // Make the actual request to the Hugging Face Inference API.
        // The Authorization header securely includes your API token.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${huggingFaceApiToken}` // Use the securely stored token
            },
            body: JSON.stringify({
                inputs: userMessage,
                // These parameters are typical for text generation models.
                // Adjust them based on the specific Hugging Face model you are using.
                parameters: {
                    max_new_tokens: 100, // Maximum number of tokens to generate in the response
                    temperature: 0.7,    // Controls randomness (higher = more random)
                    do_sample: true      // Whether to sample from the distribution (true for creative text)
                }
            })
        });

        const result = await response.json(); // Parse the JSON response from Hugging Face

        // Check if the response from Hugging Face was successful (status 200).
        if (response.status !== 200) {
            console.error("Hugging Face API Error Response:", result);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: result.error || "Error from Hugging Face API" }),
            };
        }

        // Extract the generated text from the Hugging Face response.
        // The structure might vary slightly based on the model, but this is common.
        let aiResponseText = "Sorry, I couldn't get a response from the AI.";
        if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
            aiResponseText = result[0].generated_text;
        } else {
            console.error("Unexpected Hugging Face API response structure:", result);
            aiResponseText = "Unexpected response from AI. Please try again.";
        }

        // Return a successful response to your frontend with the AI's generated text.
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
