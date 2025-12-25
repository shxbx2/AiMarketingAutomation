/**
 * Netlify function for the AI Social Post Generator.
 * IMPORTANT: Save this file as 'generator-proxy.js' inside your functions folder.
 */
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (AIzaSyBi1pm4Wi7y8va6IcVUNHC0pJRLND2AvTs) {
        return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY is not set." }) };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, body: 'Invalid JSON.' };
    }

    const topic = requestBody.topic;
    if (!topic) {
        return { statusCode: 400, body: 'Missing topic.' };
    }

    // Corrected Model Name to gemini-1.5-flash
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AIzaSyBi1pm4Wi7y8va6IcVUNHC0pJRLND2AvTs}`;
    
    const systemPrompt = "You are an expert social media manager. Create a short, engaging social media post for a business in the UAE based on the user's topic. Include 3 relevant hashtags.";

    const payload = {
        contents: [{ parts: [{ text: `Topic: ${topic}` }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.8, maxOutputTokens: 200 }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || 'API Error' }) };
        }

        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Could not generate post.";
        
        return {
            statusCode: 200,
            // Changed property name to 'post' to match what index.html expects
            body: JSON.stringify({ post: generatedText })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Error.' }) };
    }
};
