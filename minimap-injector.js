// Minimap Injector - Loads the new Preact minimap UI into ChatGPT
console.log('[Entropy] Loading minimap...');

// Create a container for the minimap
const minimapContainer = document.createElement('div');
minimapContainer.id = 'entropy-minimap-root';
minimapContainer.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999999;
`;

// Make sure only the minimap itself is clickable
minimapContainer.addEventListener('click', (e) => {
  if (e.target === minimapContainer) {
    e.stopPropagation();
  }
});

// Inject into page
document.body.appendChild(minimapContainer);

// Bridge function to sync sticky data from old system to new system
function syncStickiesFromOldToNew() {
  if (typeof StickyNote !== 'undefined' && StickyNote.allNotes) {
    const stickies = StickyNote.allNotes.map(note => ({
      id: note.data.id,
      title: note.title || note.data.title || 'Untitled',
      color: note.color || note.data.color || '#14532d',
      content: {
        context: note.data.content?.context || 'No context'
      }
    }));
    
    // Update the new UI store
    if (window.entropyStore) {
      window.entropyStore.setState({ stickies });
    }
  }
}

// Sync every 2 seconds to keep minimap updated
setInterval(syncStickiesFromOldToNew, 2000);

console.log('[Entropy] Minimap container ready'); 