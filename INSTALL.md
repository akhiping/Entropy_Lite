# Installation Guide

## Prerequisites

- **Google Chrome** (version 88 or higher)
- **OpenAI API Key** (for chat functionality)

## Step-by-Step Installation

### 1. Download the Extension

**Option A: Download ZIP**
1. Go to the [releases page](https://github.com/yourusername/entropy-chatgpt-extension/releases)
2. Download the latest release ZIP file
3. Extract to a folder on your computer

**Option B: Clone Repository**
```bash
git clone https://github.com/yourusername/entropy-chatgpt-extension.git
cd entropy-chatgpt-extension
```

### 2. Load into Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer Mode** (toggle switch in top right)
4. Click **"Load unpacked"**
5. Select the extension folder you downloaded/cloned
6. The extension should now appear in your extensions list

### 3. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in to your OpenAI account (create one if needed)
3. Click **"Create new secret key"**
4. Copy the generated API key (save it somewhere safe!)

### 4. Configure the Extension

1. Click the Entropy extension icon in Chrome toolbar
2. Select **"Options"** or right-click → **"Options"**
3. Paste your OpenAI API key in the provided field
4. Click **"Save"**

### 5. Test Installation

1. Go to [ChatGPT](https://chat.openai.com/)
2. Start a conversation or open an existing one
3. Select any text in the conversation
4. You should see an **"entertain"** button appear
5. Click it to create your first sticky note!

## Troubleshooting

### Extension Not Loading
- Make sure Developer Mode is enabled
- Try reloading the extension page
- Check for error messages in the extensions panel

### "entertain" Button Not Appearing
- Refresh the ChatGPT page
- Make sure you're on chat.openai.com or chatgpt.com
- Try selecting text again

### API Key Issues
- Verify your API key is correct (no extra spaces)
- Check your OpenAI account has credits available
- Try generating a new API key

### Notes Not Saving
- Check browser storage permissions
- Try disabling other ChatGPT extensions temporarily
- Clear browser cache and reload

## Security Notes

- Your API key is stored locally in your browser only
- Notes are stored locally - they don't sync between devices
- The extension doesn't collect or transmit personal data

## Need Help?

- Check the [FAQ](FAQ.md)
- Report issues on [GitHub Issues](https://github.com/yourusername/entropy-chatgpt-extension/issues)
- Read the [troubleshooting guide](TROUBLESHOOTING.md) 