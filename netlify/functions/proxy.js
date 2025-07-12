// This is a Netlify serverless function that acts as a secure proxy.
// It takes a request from your website, adds your secret API key,
// sends it to Hugging Face, and returns the response.

exports.handler = async (event) => {
    // Only allow POST requests.
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ error: 'This function only accepts POST requests.' }),
        };
    }

    // Get the secret API key from the Netlify environment variables.
    const HUGGING_FACE_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN;

    if (!HUGGING_FACE_API_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API token is not configured on the server.' }),
        };
    }

    try {
        // Get the data sent from the website (the prompt and model).
        const { model, inputs } = JSON.parse(event.body);
        
        if (!model || !inputs) {
            return {
                statusCode: 400, // Bad Request
                body: JSON.stringify({ error: 'Missing "model" or "inputs" in the request body.' }),
            };
        }

        const hfURL = `https://api-inference.huggingface.co/models/${model}`;

        // Use the native fetch API to call Hugging Face.
        const response = await fetch(hfURL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: inputs }),
        });

        // If Hugging Face returned an error, pass it back to the client.
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Hugging Face API Error:', errorText);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Hugging Face API Error: ${errorText}` }),
            };
        }

        // If successful, get the JSON data and return it.
        const data = await response.json();
        
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };

    } catch (error) {
        console.error('Proxy Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `An internal server error occurred: ${error.message}` }),
        };
    }
};
