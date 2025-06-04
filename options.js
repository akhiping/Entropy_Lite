document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById('apiKey');
  const status = document.getElementById('status');

  chrome.storage.local.get('openai_api_key', (data) => {
    if (data.openai_api_key) input.value = data.openai_api_key;
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const key = input.value.trim();
    if (!key) {
      status.textContent = "❌ Please enter a valid API key.";
      status.style.color = "red";
      return;
    }

    chrome.storage.local.set({ openai_api_key: key }, () => {
      status.textContent = "✅ Saved!";
      status.style.color = "green";
      setTimeout(() => status.textContent = "", 2000);
    });
  });
});
