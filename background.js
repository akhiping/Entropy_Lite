chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "askGPTWithContext") {
    const { context, question } = message;

    chrome.storage.local.get("openai_api_key", async (data) => {
      const apiKey = data.openai_api_key;

      if (!apiKey) {
        console.log('[Entropy] No API key found');
        return sendResponse("❌ No API key found. Please set your API key in the extension options.");
      }

      try {
        const apiPayload = {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: `The user is referring to: "${context}"` },
            { role: "user", content: question }
          ],
          temperature: 0.7,
          max_tokens: 300
        };

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(apiPayload)
        });

        const data = await res.json();

        if (res.ok) {
          sendResponse(data.choices[0].message.content.trim());
        } else {
          console.error('[Entropy] API error:', data.error);
          sendResponse(`❌ API error: ${data.error?.message || "Unknown error"}`);
        }
      } catch (err) {
        console.error('[Entropy] Error:', err);
        sendResponse(`❌ Error: ${err.message}`);
      }
    });

    return true; // Required for async response
  }
});
