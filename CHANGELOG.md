# Changelog

All notable changes to the Entropy ChatGPT Extension will be documented in this file.

## [1.0.0] - 2024-12-03

### ✨ Features
- **Persistent sticky notes** that survive chat navigation
- **Contextual chat integration** with OpenAI API
- **Smart stacking system** for organizing multiple notes
- **Color customization** with 5 theme options
- **Resizable and draggable** note interface
- **Per-chat organization** with automatic isolation
- **Minimize/expand** functionality for space management

### 🛠️ Technical Improvements
- **Robust storage system** with corruption detection and cleanup
- **Ghost sticky purging** to prevent deleted notes from reappearing
- **Relative positioning** for consistent placement across sessions
- **Comprehensive error handling** and recovery mechanisms
- **Debug mode** for developers with detailed logging
- **Production-ready logging** with minimal console output

### 🔧 Bug Fixes
- Fixed sticky notes reappearing after deletion
- Resolved cross-chat contamination issues
- Improved stack positioning and navigation
- Enhanced storage cleanup and validation
- Fixed context preservation in chat conversations

### 📚 Documentation
- Complete installation guide
- Professional README with clear feature descriptions
- Troubleshooting documentation
- Security and privacy information
- Contributing guidelines

### 🔐 Security
- Local-only storage (no data transmission)
- Secure API key handling
- No user tracking or analytics
- Open source codebase for transparency

## Development Notes

### Code Quality
- Implemented debug flag system for clean production builds
- Reduced verbose logging by 90% for end users
- Added comprehensive error handling
- Modular code structure for maintainability

### Known Issues
- ChatGPT UI updates may require repositioning adjustments
- Chrome-only compatibility (other browsers not tested)
- No cross-device synchronization
- API usage costs apply for OpenAI integration

### Future Roadmap
- Firefox and Edge browser support
- Cloud synchronization options
- Visual graph view of note relationships
- Export/import functionality
- Collaboration features 