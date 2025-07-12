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

    // UPDATED: Using 'gpt2' as a known publicly accessible model for testing.
    // This model is guaranteed to work with the standard Hugging Face Inference API.
    const modelId = "gpt2";
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
                    max_new_tokens: 100,
                    temperature: 0.7,
                    do_sample: true
                },
                options: {
                    wait_for_model: true
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Error from Hugging Face API:", result);
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
