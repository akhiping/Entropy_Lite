# Entropy – ChatGPT Persistent Sticky Notes

> Transform ChatGPT into a branching, non-linear ideation system with persistent sticky notes.

## 🌟 Features

### 📌 Persistent Sticky Notes
- **Create contextual notes** from any selected text in ChatGPT
- **Chat-powered sticky notes** - each note is a mini GPT conversation
- **Cross-session persistence** - notes stay exactly where you placed them
- **Per-chat organization** - notes are automatically organized by conversation

### 🎨 Rich Customization
- **Color-coded notes** with 5 color themes
- **Custom titles** and labels for organization
- **Resizable and draggable** notes
- **Minimize/expand** functionality

### 📚 Smart Stacking
- **Automatic stacking** when notes overlap
- **Stack navigation** with arrow controls
- **Visual organization** of related ideas

### 🤖 ChatGPT Integration
- **Contextual conversations** - each note remembers the selected text
- **OpenAI API integration** for real responses
- **Conversation history** within each note

## 🚀 Installation

### 1. Download the Extension
```bash
git clone https://github.com/yourusername/entropy-chatgpt-extension.git
cd entropy-chatgpt-extension
```

### 2. Load in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the extension folder

### 3. Configure API Key
1. Click the extension icon in your browser
2. Go to **Options**
3. Enter your OpenAI API key
4. Save settings

## 💡 How to Use

### Creating a Sticky Note
1. Go to [ChatGPT](https://chat.openai.com/)
2. **Select any text** in a conversation
3. Click the **"entertain"** button that appears
4. A sticky note will be created at that location

### Using Sticky Notes
- **Ask questions** about the selected context
- **Customize** with colors and titles
- **Resize and reposition** as needed
- **Navigate between chats** - notes persist automatically

### Managing Stacks
- **Drag notes close together** to create stacks
- **Use arrow buttons** to navigate through stacked notes
- **Automatic organization** keeps related ideas together

## ⚙️ Configuration

### API Key Setup
You'll need an OpenAI API key to enable the chat functionality:

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Open extension options
3. Enter your API key
4. Save and refresh ChatGPT

### Debug Mode
For developers or troubleshooting:
- Edit `content.js` 
- Set `DEBUG_MODE = true` for detailed logging
- Reload the extension

## 🛠️ Technical Details

### Architecture
- **Content Script**: Main functionality and UI
- **Background Script**: OpenAI API integration
- **Local Storage**: Persistent note storage
- **CSS Injection**: Custom styling

### Browser Support
- **Chrome**: Full support (Manifest V3)
- **Edge**: Should work (untested)
- **Firefox**: Not supported (different manifest format)

## 🔐 Privacy & Security

- **Local storage only** - all notes stored in your browser
- **No data collection** - extension doesn't track usage
- **API key security** - stored locally in browser storage
- **Open source** - full code available for review

## 🐛 Known Issues & Limitations

- **ChatGPT UI updates** may temporarily break positioning
- **API costs** - each note conversation uses your OpenAI credits
- **Chrome only** - currently supports Chrome/Chromium browsers
- **No sync** - notes don't sync between devices

## 🔄 Updates & Maintenance

The extension automatically handles:
- **Storage cleanup** - removes corrupted data
- **Position correction** - fixes note positioning issues  
- **Cross-chat isolation** - prevents note contamination

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details

## 🙏 Acknowledgments

- Built for the ChatGPT community
- Inspired by non-linear thinking and ideation tools
- Thanks to all contributors and users

---

**Ready to transform your ChatGPT experience?** Install Entropy and start organizing your AI conversations like never before!

