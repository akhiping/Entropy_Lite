// == Entropy Lite Sticky Notes: Per-Chat, Persistent, Non-Following ==

// Debug flag - set to false for production
const DEBUG_MODE = false;

// Debug logging function
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log('[Entropy Debug]', ...args);
  }
}

// Essential logging function for errors and important events
function log(...args) {
  console.log('[Entropy]', ...args);
}

log("✅ Entropy Lite loaded");

// ========== Helpers ==========

// Returns current chat ID (from /c/{id}), or uses pathname as fallback
function getCurrentChatId() {
  // More robust chat ID extraction
  const url = window.location.href;
  const pathname = window.location.pathname;
  
  // Try to match the chat ID from the URL
  const match = pathname.match(/\/c\/([\w-]+)/);
  if (match) {
    const chatId = match[1];
    debugLog(`Extracted chat ID: ${chatId} from URL: ${url}`);
    return chatId;
  }
  
  // Fallback to pathname if no match found
  debugLog(`No chat ID found in URL: ${url}, using pathname: ${pathname}`);
  return pathname;
}
function chatKey() {
  return `entropy_chat_${getCurrentChatId()}`;
}
function stickyKey(id) {
  return `entropy_sticky_${getCurrentChatId()}_${id}`;
}

// ========== StickyNote Class ==========

class StickyNote {
  static allNotes = [];
  static stacks = {}; // {stackId: [noteId, ...]}
  static stackPrefix = 'entropy_stack_';

  constructor(stickyData) {
    this.data = stickyData;
    this.element = null;
    this._retryCount = 0;
    this.isMinimized = stickyData.content?.isMinimized || false;
    this.color = stickyData.color || 'rgba(255, 248, 150, 0.85)'; // Mild sticky-note yellow
    this.title = stickyData.title || (stickyData.content?.context?.substring(0, 30) + (stickyData.content?.context?.length > 30 ? '...' : '')) || 'Untitled';
    this.zIndex = stickyData.zIndex || 1000;
    this.stackId = stickyData.stackId || null;
    this.stackIndex = stickyData.stackIndex || 0;
    
    // Only push if not already present
    if (!StickyNote.allNotes.find(n => n.data.id === this.data.id)) {
      StickyNote.allNotes.push(this);
    }
  }

  create() {
    const { id, position, dimensions, content, anchorId } = this.data;
    const box = document.createElement('div');
    box.className = 'gpt-response';
    box.dataset.entropyId = id;
    box.style.position = 'absolute';
    box.style.top = position.top;
    box.style.left = position.left;
    box.style.width = dimensions.width;
    box.style.height = dimensions.height;
    box.style.zIndex = this.zIndex;
    box.style.background = this.color;
    box.style.borderRadius = "10px";
    box.style.boxShadow = "0 2px 12px rgba(0,0,0,0.14)";
    box.style.overflow = "hidden";

    // Bring to front on click
    box.addEventListener('mousedown', () => this.bringToFront());
    box.addEventListener('click', () => this.bringToFront());

    // Create enhanced layout with title bar, color picker, and stack arrows
    box.innerHTML = `
      <div class="header">
        <div class="header-buttons">
          <button class="close-btn">✖</button>
          <button class="minimize-btn">${content.isMinimized ? '+' : '—'}</button>
          <!-- <button class="export-btn" title="Export options">📤</button> -->
          <span class="stack-arrows" style="display:none">
            <button class="stack-left">⟨</button>
            <button class="stack-right">⟩</button>
          </span>
        </div>
        <!-- <div class="export-dropdown" style="display: none;">
          <div class="export-option" data-export="notion">
            <span class="export-icon">📝</span>
            <span class="export-label">Export to Notion</span>
          </div>
          <div class="export-option" data-export="markdown">
            <span class="export-icon">📄</span>
            <span class="export-label">Copy as Markdown</span>
          </div>
          <div class="export-option" data-export="json">
            <span class="export-icon">🔧</span>
            <span class="export-label">Export as JSON</span>
          </div>
          <div class="export-option" data-export="email">
            <span class="export-icon">📧</span>
            <span class="export-label">Send via Email</span>
          </div>
          <div class="export-option" data-export="clipboard">
            <span class="export-icon">📋</span>
            <span class="export-label">Copy to Clipboard</span>
          </div>
        </div> -->
        <div class="title-bar">
          <input type="text" class="title-input" value="${this.title}" />
                      <div class="color-picker">
             <div class="theme-selector">
               <div class="theme-circle" data-theme="pastel" title="Pastel">
                 <div class="theme-preview">
                   <div style="background: rgba(255, 182, 193, 0.8);"></div>
                   <div style="background: rgba(221, 160, 221, 0.8);"></div>
                   <div style="background: rgba(173, 216, 230, 0.8);"></div>
                 </div>
               </div>
               <div class="theme-circle" data-theme="warm" title="Warm">
                 <div class="theme-preview">
                   <div style="background: rgba(255, 99, 71, 0.8);"></div>
                   <div style="background: rgba(255, 165, 0, 0.8);"></div>
                   <div style="background: rgba(255, 215, 0, 0.8);"></div>
                 </div>
               </div>
               <div class="theme-circle" data-theme="cold" title="Cold">
                 <div class="theme-preview">
                   <div style="background: rgba(70, 130, 180, 0.8);"></div>
                   <div style="background: rgba(32, 178, 170, 0.8);"></div>
                   <div style="background: rgba(72, 209, 204, 0.8);"></div>
                 </div>
               </div>
               <div class="theme-circle" data-theme="vintage" title="Vintage">
                 <div class="theme-preview">
                   <div style="background: rgba(139, 69, 19, 0.8);"></div>
                   <div style="background: rgba(160, 82, 45, 0.8);"></div>
                   <div style="background: rgba(188, 143, 143, 0.8);"></div>
                 </div>
               </div>
             </div>
             <div class="color-options">
               <!-- Colors will be populated dynamically -->
             </div>
             <div class="color-option transparent-option" data-color="transparent" style="background: transparent; border: 1px dashed #888;">
               <span style="font-size: 10px; color: #666;">Clear</span>
             </div>
            </div>
        </div>
        <div class="context-label"><strong>Context:</strong> ${content.context}</div>
      </div>
      <div class="chat-history" style="padding:8px;${content.isMinimized ? 'display:none' : ''}"></div>
      <div class="chat-input" style="padding:8px;display:${content.isMinimized ? 'none' : 'flex'};gap:5px;">
        <input type="text" class="chat-message-input" style="flex:1" placeholder="Ask something relevant..." />
        <button class="send-btn">➤</button>
      </div>
      <div class="resize-handle"></div>
    `;

    // Try to find anchor
    let anchorElem = null;
    if (anchorId) {
      anchorElem = document.querySelector(`[data-entropy-anchor="${anchorId}"]`);
    }
    if (!anchorElem && this.data.anchorText) {
      // Try to find by text content
      anchorElem = Array.from(document.querySelectorAll('*'))
        .find(el => el.textContent === this.data.anchorText);
      if (anchorElem) {
        anchorElem.setAttribute('data-entropy-anchor', anchorId);
      }
    }
    if (!anchorElem && this._retryCount < 10) {
      this._retryCount++;
      setTimeout(() => this.create(), 200);
      return;
    }
    if (!anchorElem) {
      anchorElem = document.querySelector('main') || document.body;
      box.style.top = '40px';
      box.style.left = '40px';
      box.style.width = '320px';
      box.style.height = '200px';
    }
    
    // Ensure anchor is positioned for relative positioning
    if (anchorElem && anchorElem !== document.body) {
      const computedStyle = window.getComputedStyle(anchorElem);
      if (computedStyle.position === 'static') {
        anchorElem.style.position = 'relative';
      }
    }
    
    // Use relative positioning if available and anchor element is valid
    // BUT: If this sticky is part of a stack, don't position it yet - let stack restoration handle it
    if (this.stackId) {
      // This sticky is part of a stack - use default position for now, stack restoration will fix it
      debugLog(`Sticky ${this.data.id} is part of stack ${this.stackId}, skipping individual positioning`);
      box.style.top = '100px';
      box.style.left = '100px';
    } else if (anchorElem && anchorElem !== document.body && 
        typeof this.data.relTopRatio === 'number' && typeof this.data.relLeftRatio === 'number') {
      const anchorRect = anchorElem.getBoundingClientRect();
      const topPx = anchorRect.height * this.data.relTopRatio;
      const leftPx = anchorRect.width * this.data.relLeftRatio;
      box.style.top = topPx + 'px';
      box.style.left = leftPx + 'px';
    } else {
      // Fallback to saved pixel positions (for backwards compatibility)
      box.style.top = position.top;
      box.style.left = position.left;
    }
    anchorElem.appendChild(box);
    this.element = box;
    this.setChatHistory(content.chatHistory || []);
    this.updateContextDisplay();
    this.initEvents();
    this.initializeColorPicker();
    this.initializeTitleEdit();
    this.initializeStackArrows();
    // this.initializeExportFeatures();
    
    // Adjust layout for proper sizing - wait for DOM to be fully added, then adjust multiple times
    setTimeout(() => this.adjustLayout(), 0);
    setTimeout(() => this.adjustLayout(), 50);
    setTimeout(() => this.adjustLayout(), 150);
    
    if (content.isMinimized) this.minimize();
    return box;
  }

  setChatHistory(historyArr) {
    const chatHistory = this.element.querySelector('.chat-history');
    chatHistory.innerHTML = '';
    for (const msg of historyArr) {
      const div = document.createElement('div');
      div.className = msg.role === 'user' ? 'user-msg' : 'bot-msg';
      div.textContent = `${msg.role === 'user' ? 'You' : '🤖'}: ${msg.content}`;
      chatHistory.appendChild(div);
    }
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Adjust layout after setting content
    setTimeout(() => this.adjustLayout(), 50);
  }

  updateContextDisplay() {
    // Ensure the context display always shows the original selected text
    const contextLabel = this.element.querySelector('.context-label');
    if (contextLabel && this.data.content && this.data.content.context) {
      contextLabel.innerHTML = `<strong>Context:</strong> ${this.data.content.context}`;
    }
  }

  extractData() {
    // Read current DOM state for saving
    const box = this.element;
    const id = this.data.id;
    const chatHistoryDiv = box.querySelector('.chat-history');
    const chatHistory = [];
    for (const msgDiv of chatHistoryDiv.children) {
      chatHistory.push({
        role: msgDiv.className === 'user-msg' ? 'user' : 'bot',
        content: msgDiv.textContent.replace(/^You: |^🤖: /, '')
      });
    }

    // Calculate relative positioning based on current anchor element
    let relTopRatio = this.data.relTopRatio;
    let relLeftRatio = this.data.relLeftRatio;
    
    // Find the anchor element to calculate relative positioning
    const anchorElem = document.querySelector(`[data-entropy-anchor="${this.data.anchorId}"]`) || 
                      (this.data.anchorText ? Array.from(document.querySelectorAll('*'))
                        .find(el => el.textContent === this.data.anchorText) : null) ||
                      document.querySelector('main') || document.body;
    
    if (anchorElem && anchorElem !== document.body) {
      const anchorRect = anchorElem.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      
      // Calculate relative position as ratios of the anchor element dimensions
      const relTopPx = boxRect.top - anchorRect.top;
      const relLeftPx = boxRect.left - anchorRect.left;
      
      if (anchorRect.height > 0 && anchorRect.width > 0) {
        relTopRatio = relTopPx / anchorRect.height;
        relLeftRatio = relLeftPx / anchorRect.width;
      }
    }

    return {
      ...this.data,
      relTopRatio,
      relLeftRatio,
      position: { top: box.style.top, left: box.style.left },
      dimensions: { width: box.style.width, height: box.style.height },
      color: this.color,
      title: this.title,
      zIndex: this.zIndex,
      stackId: this.stackId,
      stackIndex: this.stackIndex,
      content: {
        context: this.data.content.context, // ALWAYS preserve the original context
        chatHistory,
        isMinimized: chatHistoryDiv.style.display === 'none'
      },
      lastModified: Date.now()
    };
  }

  async save() {
    const data = this.extractData();
    await chrome.storage.local.set({ [stickyKey(data.id)]: data });
    // Index for current chat
    const chatK = chatKey();
    chrome.storage.local.get([chatK], res => {
      let stickyIds = res[chatK] || [];
      if (!stickyIds.includes(data.id)) {
        stickyIds.push(data.id);
        chrome.storage.local.set({ [chatK]: stickyIds });
      }
    });
  }

  autoSave() {
    clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => this.save(), 600);
  }

  remove() {
    debugLog(`Removing sticky ${this.data.id} from chat ${getCurrentChatId()}`);
    
    const stickyStorageKey = stickyKey(this.data.id);
    const chatK = chatKey();
    
    // Remove from stack if it's part of one
    if (this.stackId && StickyNote.stacks[this.stackId]) {
      debugLog(`Removing ${this.data.id} from stack ${this.stackId}`);
      const stack = StickyNote.stacks[this.stackId];
      const noteIndex = stack.indexOf(this.data.id);
      if (noteIndex > -1) {
        stack.splice(noteIndex, 1);
        
        if (stack.length === 0) {
          // Remove empty stack
          delete StickyNote.stacks[this.stackId];
          const chatId = getCurrentChatId();
          const stackKey = `entropy_${chatId}_stack_${this.stackId}`;
          const stackPositionKey = `entropy_${chatId}_stack_position_${this.stackId}`;
          chrome.storage.local.remove([stackKey, stackPositionKey]);
          debugLog(`Removed empty stack ${this.stackId}`);
        } else if (stack.length === 1) {
          // Only one note left, remove it from stack
          const remainingNote = StickyNote.allNotes.find(n => n.data.id === stack[0]);
          if (remainingNote) {
            remainingNote.stackId = null;
            remainingNote.stackIndex = 0;
            remainingNote.updateStackUI();
            remainingNote.save();
          }
          delete StickyNote.stacks[this.stackId];
          const chatId = getCurrentChatId();
          const stackKey = `entropy_${chatId}_stack_${this.stackId}`;
          const stackPositionKey = `entropy_${chatId}_stack_position_${this.stackId}`;
          chrome.storage.local.remove([stackKey, stackPositionKey]);
          debugLog(`Unstacked last remaining note in ${this.stackId}`);
        } else {
          // Update remaining notes in stack
          StickyNote.stacks[this.stackId] = stack;
          this.saveStackToStorage(this.stackId);
          
          // Update stack indices for remaining notes
          stack.forEach((id, idx) => {
            const note = StickyNote.allNotes.find(n => n.data.id === id);
            if (note) {
              note.stackIndex = idx;
              note.save();
            }
          });
          
          // Show the top note of the remaining stack
          this.showOnlyTopOfStack(this.stackId);
          debugLog(`Updated stack ${this.stackId} with ${stack.length} remaining notes`);
        }
      }
    }
    
    // Remove from DOM
    if (this.element) {
      this.element.remove();
      debugLog(`Removed sticky ${this.data.id} from DOM`);
    }
    
    // Remove from allNotes array
    const noteIndex = StickyNote.allNotes.findIndex(n => n.data.id === this.data.id);
    if (noteIndex > -1) {
      StickyNote.allNotes.splice(noteIndex, 1);
      debugLog(`Removed sticky ${this.data.id} from memory`);
    }
    
    // Simplified storage removal - just delete it completely
    chrome.storage.local.get([chatK], (chatResult) => {
      const currentIndex = chatResult[chatK] || [];
      const newIndex = currentIndex.filter(id => id !== this.data.id);
      
      // Force immediate removal from both index and storage
      const updates = {};
      updates[chatK] = newIndex;
      
      chrome.storage.local.set(updates, () => {
        // Explicitly remove the storage key
        chrome.storage.local.remove([stickyStorageKey], () => {
          debugLog(`Successfully removed sticky ${this.data.id} from storage and index`);
        });
      });
    });
  }

  minimize() {
    this.isMinimized = true;
    this.data.content.isMinimized = true;
    this.element.querySelector('.chat-history').style.display = 'none';
    this.element.querySelector('.chat-input').style.display = 'none';
    this.element.querySelector('.minimize-btn').textContent = '+';
    
    // Set a fixed small height when minimized
    this.element.style.height = 'auto';
    this.autoSave();
  }
  restore() {
    this.isMinimized = false;
    this.data.content.isMinimized = false;
    this.element.querySelector('.chat-history').style.display = '';
    this.element.querySelector('.chat-input').style.display = 'flex';
    this.element.querySelector('.minimize-btn').textContent = '—';
    
    // Adjust layout after restoring
    setTimeout(() => this.adjustLayout(), 50);
    this.autoSave();
  }

  initEvents() {
    // Drag
    const box = this.element;
    const header = box.querySelector('.header');
    let offsetX, offsetY, dragging = false;
    header.style.cursor = 'move';
    header.addEventListener('mousedown', (e) => {
      // Skip dragging for input elements and buttons
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || 
          e.target.classList.contains('send-btn') || e.target.classList.contains('color-option') ||
          e.target.classList.contains('close-btn') || e.target.classList.contains('minimize-btn') ||
          e.target.classList.contains('export-btn') || e.target.closest('.export-dropdown') ||
          e.target.classList.contains('stack-left') || e.target.classList.contains('stack-right') ||
          e.target.classList.contains('theme-circle') || e.target.closest('.theme-circle') ||
          e.target.closest('.color-picker') || e.target.closest('.theme-preview')) {
        return;
      }
      e.preventDefault();
      dragging = true;
      this.bringToFront();
      offsetX = e.clientX - box.offsetLeft;
      offsetY = e.clientY - box.offsetTop;
      document.body.style.userSelect = "none";
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      box.style.left = `${e.clientX - offsetX}px`;
      box.style.top = `${e.clientY - offsetY}px`;
      this.autoSave();
    });
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        document.body.style.userSelect = "";
        this.save();
        // Check for stacking after drag
        setTimeout(() => this.checkForStacking(), 100);
      }
    });

    // Resize
    const handle = box.querySelector('.resize-handle');
    let resizing = false, startW, startH, startX, startY;
    handle.addEventListener('mousedown', (e) => {
      resizing = true;
      this._isResizing = true; // Track resize state
      startW = box.offsetWidth;
      startH = box.offsetHeight;
      startX = e.clientX;
      startY = e.clientY;
      e.stopPropagation();
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const newWidth = Math.max(160, startW + (e.clientX - startX));
      const newHeight = Math.max(100, startH + (e.clientY - startY));
      box.style.width = newWidth + 'px';
      box.style.height = newHeight + 'px';
      
      // Manually adjust chat history height during resize
      const chatHistory = box.querySelector('.chat-history');
      const header = box.querySelector('.header');
      const chatInput = box.querySelector('.chat-input');
      if (chatHistory && header && chatInput) {
        const headerHeight = header.offsetHeight;
        const chatInputHeight = chatInput.offsetHeight;
        const availableHeight = newHeight - headerHeight - chatInputHeight - 16;
        chatHistory.style.height = Math.max(availableHeight, 30) + 'px';
      }
      
      this.autoSave();
    });
    document.addEventListener('mouseup', () => {
      if (resizing) {
        resizing = false;
        this._isResizing = false; // Clear resize state
        this.save();
      }
    });

    // Close/minimize/export
    box.querySelector('.close-btn').onclick = () => this.remove();
    const minBtn = box.querySelector('.minimize-btn');
    minBtn.onclick = () => {
      if (minBtn.textContent === '—') this.minimize();
      else this.restore();
      this.autoSave();
    };
    
    // Export button setup - COMMENTED OUT (not functional yet)
    // const exportBtn = box.querySelector('.export-btn');
    // if (exportBtn) {
    //   exportBtn.onclick = (e) => {
    //     console.log('Export button clicked via onclick!');
    //     e.preventDefault();
    //     e.stopPropagation();
    //     const exportDropdown = this.element.querySelector('.export-dropdown');
    //     if (exportDropdown) {
    //       const isVisible = exportDropdown.style.display !== 'none';
    //       exportDropdown.style.display = isVisible ? 'none' : 'block';
    //       console.log('Dropdown display set to:', exportDropdown.style.display);
    //     }
    //   };
    // }

    // Chat logic with API integration
    const chatInput = box.querySelector('.chat-message-input');
    const sendBtn = box.querySelector('.send-btn');
    
    const sendMessage = () => {
      const question = chatInput.value.trim();
      if (!question) return;
      
      debugLog('Sending message:', question);
      
      this.addMessage('user', question);
      this.addMessage('bot', '🤖 Thinking...');
      chatInput.value = '';
      this.autoSave();
      
      // Use Chrome extension API if available, otherwise fallback
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const messageData = {
          action: "askGPTWithContext",
          context: this.data.content.context,
          question: question
        };
        
        debugLog('Sending to background:', messageData);
        
        chrome.runtime.sendMessage(messageData, (response) => {
          debugLog('Received response:', response);
          // Find and update the last bot message
          const botMessages = this.element.querySelectorAll('.bot-msg');
          const lastBotMessage = botMessages[botMessages.length - 1];
          if (lastBotMessage && lastBotMessage.textContent.includes('Thinking...')) {
            lastBotMessage.textContent = `🤖: ${response}`;
          }
          this.adjustLayout();
          this.updateContextDisplay();
          this.autoSave();
        });
      } else {
        // Fallback response
        setTimeout(() => {
          const botMessages = this.element.querySelectorAll('.bot-msg');
          const lastBotMessage = botMessages[botMessages.length - 1];
          if (lastBotMessage && lastBotMessage.textContent.includes('Thinking...')) {
            lastBotMessage.textContent = '🤖: (API integration needed for real responses)';
          }
          this.adjustLayout();
          this.updateContextDisplay();
          this.autoSave();
        }, 700);
      }
    };
    
    sendBtn.onclick = sendMessage;
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    // Save on input, dragend, etc
    box.addEventListener('input', () => this.autoSave());
  }

  checkForStacking() {
    // Only stack if not already in a stack
    if (this.stackId) return;
    
    const myRect = this.element.getBoundingClientRect();
    console.log('[Entropy] Checking for stacking:', this.data.id);
    
    for (const other of StickyNote.allNotes) {
      if (other === this || !other.element) continue;
      
      const otherRect = other.element.getBoundingClientRect();
      const overlap = this.isOverlapping(myRect, otherRect);
      
      if (overlap) {
        console.log(`[Entropy] Found overlap between ${this.data.id} and ${other.data.id}`);
        
        // Create or join stack
        let stackId = null;
        if (!this.stackId && !other.stackId) {
          // Neither is in a stack: create new stack
          stackId = `stack_${Date.now()}`;
          StickyNote.stacks[stackId] = [other.data.id, this.data.id];
          this.stackId = stackId;
          other.stackId = stackId;
          this.stackIndex = 1;
          other.stackIndex = 0;
          console.log(`[Entropy] Created new stack ${stackId}`);
        } else if (other.stackId && !this.stackId) {
          // Other is in a stack, add this
          stackId = other.stackId;
          StickyNote.stacks[stackId].push(this.data.id);
          this.stackId = stackId;
          this.stackIndex = StickyNote.stacks[stackId].length - 1;
          console.log(`[Entropy] Added ${this.data.id} to existing stack ${stackId}`);
        } else if (this.stackId && !other.stackId) {
          // This is in a stack, add other
          stackId = this.stackId;
          StickyNote.stacks[stackId].push(other.data.id);
          other.stackId = stackId;
          other.stackIndex = StickyNote.stacks[stackId].length - 1;
          console.log(`[Entropy] Added ${other.data.id} to existing stack ${stackId}`);
        }
        
        if (stackId) {
          // Align positions and sizes
          this.alignToTopOfStack(stackId);
          this.saveStackToStorage(stackId);
          this.updateStackUI();
          other.updateStackUI();
          this.showOnlyTopOfStack(stackId);
        }
        break;
      }
    }
  }

  isOverlapping(rect1, rect2) {
    const buffer = 50; // Proximity buffer for stacking
    return !(
      rect1.right < rect2.left - buffer ||
      rect1.left > rect2.right + buffer ||
      rect1.bottom < rect2.top - buffer ||
      rect1.top > rect2.bottom + buffer
    );
  }

  alignToTopOfStack(stackId) {
    const stack = StickyNote.stacks[stackId];
    if (!stack || stack.length < 2) return;
    
    // Use the position of the top note (last in stack array) as the reference
    const topNote = StickyNote.allNotes.find(n => n.data.id === stack[stack.length - 1]);
    if (!topNote || !topNote.element) return;
    
    const topPosition = {
      top: topNote.element.style.top,
      left: topNote.element.style.left,
      width: topNote.element.style.width,
      height: topNote.element.style.height
    };
    
    // Update all notes in the stack to use the top note's position
    stack.forEach(id => {
      const note = StickyNote.allNotes.find(n => n.data.id === id);
      if (note && note.element) {
        note.element.style.top = topPosition.top;
        note.element.style.left = topPosition.left;
        note.element.style.width = topPosition.width;
        note.element.style.height = topPosition.height;
        
        // Update the stored data to reflect the new stack position
        note.data.position = { top: topPosition.top, left: topPosition.left };
        note.data.dimensions = { width: topPosition.width, height: topPosition.height };
        
        // Recalculate and save relative positioning based on stack position
        note.save();
      }
    });
    
    // Save the stack position as a shared reference
    const chatId = getCurrentChatId();
    const stackPositionKey = `entropy_${chatId}_stack_position_${stackId}`;
    chrome.storage.local.set({ 
      [stackPositionKey]: topPosition
    });
  }

  saveStackToStorage(stackId) {
    const chatId = getCurrentChatId();
    const key = `entropy_${chatId}_stack_${stackId}`;
    console.log(`[Entropy] Saving stack: ${key}`);
    
    // Use chrome.storage.local for consistency
    chrome.storage.local.set({ [key]: StickyNote.stacks[stackId] });
  }

  updateStackUI() {
    const stackArrows = this.element.querySelector('.stack-arrows');
    if (this.stackId && StickyNote.stacks[this.stackId] && StickyNote.stacks[this.stackId].length > 1) {
      stackArrows.style.display = 'flex';
      const leftBtn = stackArrows.querySelector('.stack-left');
      const rightBtn = stackArrows.querySelector('.stack-right');
      leftBtn.onclick = () => this.cycleStack(-1);
      rightBtn.onclick = () => this.cycleStack(1);
    } else {
      stackArrows.style.display = 'none';
    }
  }

  showOnlyTopOfStack(stackId) {
    const stack = StickyNote.stacks[stackId];
    if (!stack) return;
    
    console.log(`[Entropy] showOnlyTopOfStack for stack ${stackId} with ${stack.length} notes`);
    
    // Find the top note (last in array) to get the reference position
    const topNoteId = stack[stack.length - 1];
    const topNote = StickyNote.allNotes.find(n => n.data.id === topNoteId);
    
    if (!topNote || !topNote.element) {
      console.log(`[Entropy] Top note ${topNoteId} not found or no element`);
      return;
    }
    
    // Get the stack position from the top note
    const stackPosition = {
      top: topNote.element.style.top,
      left: topNote.element.style.left,
      width: topNote.element.style.width,
      height: topNote.element.style.height
    };
    
    console.log(`[Entropy] Stack position: ${JSON.stringify(stackPosition)}`);
    
    // Apply this position to ALL notes in the stack and show/hide appropriately
    stack.forEach((id, idx) => {
      const note = StickyNote.allNotes.find(n => n.data.id === id);
      if (note && note.element) {
        // Position all notes at the stack location
        note.element.style.top = stackPosition.top;
        note.element.style.left = stackPosition.left;
        note.element.style.width = stackPosition.width;
        note.element.style.height = stackPosition.height;
        
        // Show only the top note (last in array)
        const isTopNote = (idx === stack.length - 1);
        note.element.style.display = isTopNote ? 'block' : 'none';
        note.element.style.zIndex = isTopNote ? '9999' : '9998';
        
        console.log(`[Entropy] Note ${id} (${idx}/${stack.length-1}): positioned at ${stackPosition.top},${stackPosition.left}, display=${note.element.style.display}`);
      } else {
        console.log(`[Entropy] Note ${id} not found or no element`);
      }
    });
  }

  cycleStack(direction) {
    if (!this.stackId) return;
    const stack = StickyNote.stacks[this.stackId];
    if (!stack || stack.length < 2) return;

    // Get the current stack anchor position from storage
    const chatId = getCurrentChatId();
    const stackPositionKey = `entropy_${chatId}_stack_position_${this.stackId}`;
    
    chrome.storage.local.get([stackPositionKey], (result) => {
      let stackPosition = result[stackPositionKey];
      
      // If no stored position, use current top note position as anchor
      if (!stackPosition) {
        const currentTopNote = StickyNote.allNotes.find(n => n.data.id === stack[stack.length - 1]);
        if (currentTopNote && currentTopNote.element) {
          stackPosition = {
            top: currentTopNote.element.style.top,
            left: currentTopNote.element.style.left,
            width: currentTopNote.element.style.width,
            height: currentTopNote.element.style.height
          };
          // Save this as the anchor position
          chrome.storage.local.set({ [stackPositionKey]: stackPosition });
        }
      }

      // Cycle through stack
      if (direction === 1) {
        stack.push(stack.shift());
      } else {
        stack.unshift(stack.pop());
      }

      StickyNote.stacks[this.stackId] = stack;
      this.saveStackToStorage(this.stackId);

      // Apply the consistent stack position to all notes
      stack.forEach((id, idx) => {
        const note = StickyNote.allNotes.find(n => n.data.id === id);
        if (note && note.element && stackPosition) {
          // Use the consistent stack anchor position
          note.element.style.top = stackPosition.top;
          note.element.style.left = stackPosition.left;
          note.element.style.width = stackPosition.width;
          note.element.style.height = stackPosition.height;
          note.data.position = { top: stackPosition.top, left: stackPosition.left };
          note.data.dimensions = { width: stackPosition.width, height: stackPosition.height };
          
          // Show only the top note
          note.element.style.display = (idx === stack.length - 1) ? 'block' : 'none';
          note.updateStackUI();
          if (idx === stack.length - 1) {
            note.bringToFront();
          }
          note.save();
        }
      });
    });
  }

  addMessage(role, content) {
    const chatHistory = this.element.querySelector('.chat-history');
    const div = document.createElement('div');
    div.className = role === 'user' ? 'user-msg' : 'bot-msg';
    div.textContent = (role === 'user' ? 'You: ' : '🤖: ') + content;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Adjust layout to fit new content
    this.adjustLayout();
    this.autoSave();
  }

  initializeColorPicker() {
    const colorPicker = this.element.querySelector('.color-picker');
    const themeCircles = colorPicker.querySelectorAll('.theme-circle');
    const colorOptions = colorPicker.querySelector('.color-options');
    const transparentOption = colorPicker.querySelector('.transparent-option');
    
    // Define color themes
    const themes = {
      pastel: [
        'rgba(255, 182, 193, 0.8)', // Light Pink
        'rgba(221, 160, 221, 0.8)', // Plum
        'rgba(173, 216, 230, 0.8)', // Light Blue
        'rgba(255, 218, 185, 0.8)', // Peach
        'rgba(152, 251, 152, 0.8)', // Pale Green
        'rgba(230, 230, 250, 0.8)'  // Lavender
      ],
      warm: [
        'rgba(255, 99, 71, 0.8)',   // Tomato
        'rgba(255, 165, 0, 0.8)',   // Orange
        'rgba(255, 215, 0, 0.8)',   // Gold
        'rgba(255, 69, 0, 0.8)',    // Red Orange
        'rgba(255, 140, 0, 0.8)',   // Dark Orange
        'rgba(220, 20, 60, 0.8)'    // Crimson
      ],
      cold: [
        'rgba(70, 130, 180, 0.8)',  // Steel Blue
        'rgba(32, 178, 170, 0.8)',  // Light Sea Green
        'rgba(72, 209, 204, 0.8)',  // Medium Turquoise
        'rgba(0, 191, 255, 0.8)',   // Deep Sky Blue
        'rgba(64, 224, 208, 0.8)',  // Turquoise
        'rgba(95, 158, 160, 0.8)'   // Cadet Blue
      ],
      vintage: [
        'rgba(139, 69, 19, 0.8)',   // Saddle Brown
        'rgba(160, 82, 45, 0.8)',   // Sienna
        'rgba(188, 143, 143, 0.8)', // Rosy Brown
        'rgba(205, 133, 63, 0.8)',  // Peru
        'rgba(210, 180, 140, 0.8)', // Tan
        'rgba(222, 184, 135, 0.8)'  // Burlywood
      ]
    };
    
    let currentActiveTheme = null;
    
    // Handle theme circle clicks
    themeCircles.forEach(circle => {
      circle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const theme = circle.getAttribute('data-theme');
        
        if (currentActiveTheme === theme) {
          // Collapse if same theme clicked
          colorOptions.classList.remove('expanded');
          circle.classList.remove('active');
          currentActiveTheme = null;
        } else {
          // Expand new theme
          themeCircles.forEach(c => c.classList.remove('active'));
          circle.classList.add('active');
          currentActiveTheme = theme;
          
          // Populate color options
          colorOptions.innerHTML = '';
          themes[theme].forEach(color => {
            const option = document.createElement('div');
            option.className = 'color-option';
            option.setAttribute('data-color', color);
            option.style.background = color;
            option.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.color = color;
              this.element.style.background = color;
              this.autoSave();
              // Collapse after selection
              colorOptions.classList.remove('expanded');
              circle.classList.remove('active');
              currentActiveTheme = null;
            });
            colorOptions.appendChild(option);
          });
          
          colorOptions.classList.add('expanded');
        }
      });
      
      // Add hover tooltip
      circle.addEventListener('mouseenter', () => {
        const theme = circle.getAttribute('data-theme');
        circle.title = theme.charAt(0).toUpperCase() + theme.slice(1);
      });
    });

    // Handle transparent option
    transparentOption.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.color = 'transparent';
      this.element.style.background = 'transparent';
      this.autoSave();
      // Collapse any open theme
      if (currentActiveTheme) {
        colorOptions.classList.remove('expanded');
        themeCircles.forEach(c => c.classList.remove('active'));
        currentActiveTheme = null;
      }
    });
    
    // Close expanded theme when clicking outside
    document.addEventListener('click', (e) => {
      if (!colorPicker.contains(e.target) && currentActiveTheme) {
        colorOptions.classList.remove('expanded');
        themeCircles.forEach(c => c.classList.remove('active'));
        currentActiveTheme = null;
      }
    });
  }

  initializeTitleEdit() {
    const titleInput = this.element.querySelector('.title-input');
    titleInput.addEventListener('input', () => {
      this.title = titleInput.value;
      this.autoSave();
    });
  }

  initializeStackArrows() {
    const stackArrows = this.element.querySelector('.stack-arrows');
    if (this.stackId) {
      stackArrows.style.display = 'flex';
      const leftBtn = stackArrows.querySelector('.stack-left');
      const rightBtn = stackArrows.querySelector('.stack-right');
      leftBtn.addEventListener('click', () => this.moveStack(-1));
      rightBtn.addEventListener('click', () => this.moveStack(1));
    } else {
      stackArrows.style.display = 'none';
    }
  }

  initializeExportFeatures() {
    const exportDropdown = this.element.querySelector('.export-dropdown');
    const exportOptions = this.element.querySelectorAll('.export-option');
    
    console.log('Export elements found:', {
      exportDropdown: !!exportDropdown,
      exportOptionsCount: exportOptions.length
    });
    
    if (!exportDropdown) {
      console.error('Export dropdown not found!');
      return;
    }
    
    // Handle export option clicks
    exportOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        console.log('Export option clicked:', option.getAttribute('data-export'));
        e.preventDefault();
        e.stopPropagation();
        const exportType = option.getAttribute('data-export');
        this.handleExport(exportType);
        exportDropdown.style.display = 'none';
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const exportBtn = this.element.querySelector('.export-btn');
      if (exportBtn && !exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
        exportDropdown.style.display = 'none';
      }
    });
  }
  
  handleExport(type) {
    const exportData = this.generateExportData();
    
    switch (type) {
      case 'notion':
        this.exportToNotion(exportData);
        break;
      case 'markdown':
        this.exportToMarkdown(exportData);
        break;
      case 'json':
        this.exportToJSON(exportData);
        break;
      case 'email':
        this.exportToEmail(exportData);
        break;
      case 'clipboard':
        this.exportToClipboard(exportData);
        break;
      default:
        console.log('Unknown export type:', type);
    }
  }
  
  generateExportData() {
    const chatHistory = this.element.querySelector('.chat-history');
    const messages = [];
    
    Array.from(chatHistory.children).forEach(msgDiv => {
      const isUser = msgDiv.className === 'user-msg';
      const content = msgDiv.textContent.replace(/^You: |^🤖: /, '');
      messages.push({
        role: isUser ? 'user' : 'assistant',
        content: content,
        timestamp: new Date().toISOString()
      });
    });
    
    return {
      title: this.title,
      context: this.data.content.context,
      messages: messages,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      chatId: getCurrentChatId()
    };
  }
  
  async exportToNotion(data) {
    // For Notion integration, we'll create a formatted text that users can paste
    // In a real implementation, you'd use Notion's API with proper authentication
    const notionContent = this.formatForNotion(data);
    
    try {
      await navigator.clipboard.writeText(notionContent);
      this.showExportSuccess('Notion-formatted content copied to clipboard! Paste it into your Notion page.');
    } catch (err) {
      this.showExportError('Failed to copy to clipboard. Please try again.');
    }
  }
  
  formatForNotion(data) {
    let content = `# ${data.title}\n\n`;
    content += `**Context:** ${data.context}\n\n`;
    content += `**Source:** ${data.url}\n\n`;
    content += `**Date:** ${new Date(data.timestamp).toLocaleDateString()}\n\n`;
    
    if (data.messages.length > 0) {
      content += `## Conversation\n\n`;
      data.messages.forEach(msg => {
        const role = msg.role === 'user' ? '👤 **You**' : '🤖 **Assistant**';
        content += `${role}: ${msg.content}\n\n`;
      });
    }
    
    content += `---\n*Exported from Entropy Sticky Notes*`;
    return content;
  }
  
  async exportToMarkdown(data) {
    const markdown = this.formatAsMarkdown(data);
    try {
      await navigator.clipboard.writeText(markdown);
      this.showExportSuccess('Markdown copied to clipboard!');
    } catch (err) {
      this.showExportError('Failed to copy markdown. Please try again.');
    }
  }
  
  formatAsMarkdown(data) {
    let md = `# ${data.title}\n\n`;
    md += `**Context:** ${data.context}\n\n`;
    md += `**Source:** [ChatGPT Conversation](${data.url})\n\n`;
    md += `**Date:** ${new Date(data.timestamp).toLocaleDateString()}\n\n`;
    
    if (data.messages.length > 0) {
      md += `## Messages\n\n`;
      data.messages.forEach((msg, index) => {
        md += `### ${msg.role === 'user' ? 'User' : 'Assistant'} (${index + 1})\n\n`;
        md += `${msg.content}\n\n`;
      });
    }
    
    return md;
  }
  
  async exportToJSON(data) {
    const jsonString = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(jsonString);
      this.showExportSuccess('JSON data copied to clipboard!');
    } catch (err) {
      this.showExportError('Failed to copy JSON. Please try again.');
    }
  }
  
  exportToEmail(data) {
    const subject = encodeURIComponent(`ChatGPT Conversation: ${data.title}`);
    const body = encodeURIComponent(this.formatForEmail(data));
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    
    try {
      window.open(mailtoLink, '_blank');
      this.showExportSuccess('Email client opened with conversation data!');
    } catch (err) {
      this.showExportError('Failed to open email client. Please try copying the content instead.');
    }
  }
  
  formatForEmail(data) {
    let content = `ChatGPT Conversation: ${data.title}\n\n`;
    content += `Context: ${data.context}\n\n`;
    content += `Source: ${data.url}\n\n`;
    content += `Date: ${new Date(data.timestamp).toLocaleDateString()}\n\n`;
    
    if (data.messages.length > 0) {
      content += `Conversation:\n\n`;
      data.messages.forEach(msg => {
        const role = msg.role === 'user' ? 'You' : 'Assistant';
        content += `${role}: ${msg.content}\n\n`;
      });
    }
    
    content += `\nExported from Entropy Sticky Notes`;
    return content;
  }
  
  async exportToClipboard(data) {
    const textContent = this.formatAsPlainText(data);
    try {
      await navigator.clipboard.writeText(textContent);
      this.showExportSuccess('Content copied to clipboard!');
    } catch (err) {
      this.showExportError('Failed to copy to clipboard. Please try again.');
    }
  }
  
  formatAsPlainText(data) {
    let text = `${data.title}\n\n`;
    text += `Context: ${data.context}\n\n`;
    text += `Source: ${data.url}\n\n`;
    text += `Date: ${new Date(data.timestamp).toLocaleDateString()}\n\n`;
    
    if (data.messages.length > 0) {
      text += `Messages:\n\n`;
      data.messages.forEach(msg => {
        const role = msg.role === 'user' ? 'You' : 'Assistant';
        text += `${role}: ${msg.content}\n\n`;
      });
    }
    
    return text;
  }
  
  showExportSuccess(message) {
    this.showExportNotification(message, 'success');
  }
  
  showExportError(message) {
    this.showExportNotification(message, 'error');
  }
  
  showExportNotification(message, type) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = `export-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : '#f44336'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  adjustLayout() {
    const chatHistory = this.element.querySelector('.chat-history');
    const header = this.element.querySelector('.header');
    const chatInput = this.element.querySelector('.chat-input');
    
    if (!chatHistory || !header) return;
    
    // Don't auto-adjust if user is manually resizing
    if (this._isResizing) return;
    
    // Wait for DOM to be fully rendered before calculating dimensions
    requestAnimationFrame(() => {
      // Calculate actual required dimensions
      const headerHeight = header.offsetHeight;
      const chatInputHeight = chatInput ? chatInput.offsetHeight : 0;
      
      // Get current dimensions
      const currentWidth = parseInt(this.element.style.width) || 420;
      const currentHeight = parseInt(this.element.style.height) || 320;
      
      // Calculate minimum height needed including proper spacing
      const minRequiredHeight = headerHeight + chatInputHeight + 80; // 80px for compact chat area
      
      // Ensure minimum width for proper display
      const minRequiredWidth = 380; // Minimum width for UI elements to prevent crowding
      
      // Adjust dimensions if needed
      if (currentHeight < minRequiredHeight) {
        this.element.style.height = minRequiredHeight + 'px';
      }
      
      if (currentWidth < minRequiredWidth) {
        this.element.style.width = minRequiredWidth + 'px';
      }
      
      // Set chat history to use available space efficiently
      const finalHeight = parseInt(this.element.style.height);
      const availableHeight = finalHeight - headerHeight - chatInputHeight - 16; // 16px padding
      chatHistory.style.height = Math.max(availableHeight, 60) + 'px'; // Minimum 60px for compact chat area
      
      // Always enable scrolling for compact design
      chatHistory.style.overflowY = 'auto';
      if (chatHistory.children.length > 0) {
        chatHistory.scrollTop = chatHistory.scrollHeight;
      }
      
      // Update stored dimensions
      this.data.dimensions.height = this.element.style.height;
      this.data.dimensions.width = this.element.style.width;
      this.autoSave();
    });
  }

  bringToFront() {
    const maxZ = Math.max(...Array.from(document.querySelectorAll('.gpt-response'))
      .map(el => parseInt(el.style.zIndex) || 0));
    this.zIndex = maxZ + 1;
    this.element.style.zIndex = this.zIndex;
    this.autoSave();
  }

  moveStack(direction) {
    // This method was referenced but not properly implemented
    this.cycleStack(direction);
  }

  static restoreStacksFromStorage() {
    const chatId = getCurrentChatId();
    console.log(`[Entropy] Restoring stacks for chatId=${chatId}`);
    
    // Clear existing stacks
    StickyNote.stacks = {};
    
    // Use chrome.storage.local to get all keys
    chrome.storage.local.get(null, (data) => {
      const stackKeys = Object.keys(data).filter(key => key.startsWith(`entropy_${chatId}_stack_`));
      const stackPositionKeys = stackKeys.filter(key => key.includes('_stack_position_'));
      const stackDataKeys = stackKeys.filter(key => !key.includes('_stack_position_'));
      
      console.log(`[Entropy] Found ${stackDataKeys.length} stacks to restore`);
      
      // First, restore stack data
      stackDataKeys.forEach(stackKey => {
        const stackId = stackKey.replace(`entropy_${chatId}_stack_`, '');
        const ids = data[stackKey];
        
        // Verify all notes in the stack still exist
        const validIds = ids.filter(id => 
          StickyNote.allNotes.find(n => n.data.id === id)
        );
        
        if (validIds.length === 0) {
          // No valid notes, remove this stack
          console.log(`[Entropy] Stack ${stackId} has no valid notes, removing`);
          chrome.storage.local.remove([stackKey, `entropy_${chatId}_stack_position_${stackId}`]);
          return;
        }
        
        if (validIds.length === 1) {
          // Only one note left, unstack it
          console.log(`[Entropy] Stack ${stackId} has only one note, unstacking`);
          const note = StickyNote.allNotes.find(n => n.data.id === validIds[0]);
          if (note) {
            note.stackId = null;
            note.stackIndex = 0;
            note.updateStackUI();
          }
          chrome.storage.local.remove([stackKey, `entropy_${chatId}_stack_position_${stackId}`]);
          return;
        }
        
        // Valid stack with multiple notes
        StickyNote.stacks[stackId] = validIds;
        console.log(`[Entropy] Restored stack ${stackId} with ${validIds.length} notes: ${validIds.join(', ')}`);
        
        // Update each note's stackId and stackIndex
        validIds.forEach((id, idx) => {
          const note = StickyNote.allNotes.find(n => n.data.id === id);
          if (note) {
            note.stackId = stackId;
            note.stackIndex = idx;
            
            if (note.element) {
              note.updateStackUI();
            }
          }
        });
      });
      
      // Now show only top of each stack - do this after all stacks are set up
      Object.keys(StickyNote.stacks).forEach(stackId => {
        const firstNote = StickyNote.allNotes.find(n => n.stackId === stackId);
        if (firstNote) {
          console.log(`[Entropy] Applying stack positioning for stack ${stackId}`);
          firstNote.showOnlyTopOfStack(stackId);
        }
      });
      
      console.log(`[Entropy] Stack restoration complete. Active stacks: ${Object.keys(StickyNote.stacks).length}`);
    });
  }
}

// ========== Persistence ==========

async function saveSticky(stickyData) {
  await chrome.storage.local.set({ [stickyKey(stickyData.id)]: stickyData });
  const chatK = chatKey();
  const res = await chrome.storage.local.get([chatK]);
  let stickyIds = res[chatK] || [];
  if (!stickyIds.includes(stickyData.id)) {
    stickyIds.push(stickyData.id);
    await chrome.storage.local.set({ [chatK]: stickyIds });
  }
}

// Debug function to see what's stored for current chat
async function debugStorageForCurrentChat() {
  if (!DEBUG_MODE) return;
  
  const currentChatId = getCurrentChatId();
  debugLog(`Storage debug for chat ${currentChatId}`);
  
  chrome.storage.local.get(null, (data) => {
    const chatKeys = Object.keys(data).filter(key => key.startsWith('entropy_chat_'));
    const stickyKeys = Object.keys(data).filter(key => key.startsWith('entropy_sticky_'));
    
    debugLog(`Total chats: ${chatKeys.length}, Total stickies: ${stickyKeys.length}`);
    
    const currentChatKey = `entropy_chat_${currentChatId}`;
    const currentChatIndex = data[currentChatKey] || [];
    debugLog(`Current chat index: [${currentChatIndex.join(', ')}]`);
  });
}

// ========== Storage Cleanup Function ==========
async function cleanupCorruptedChatIndices() {
  console.log(`[Entropy] 🧹 Starting comprehensive storage cleanup...`);
  
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (allData) => {
      const updates = {};
      
      // Get all chat indices
      const chatKeys = Object.keys(allData).filter(key => key.startsWith('entropy_chat_'));
      
      chatKeys.forEach(chatKey => {
        const chatId = chatKey.replace('entropy_chat_', '');
        const currentIndex = allData[chatKey] || [];
        
        console.log(`[Entropy] 🔍 Cleaning chat ${chatId}, current index: [${currentIndex.join(', ')}]`);
        
        // Find actual stickies that belong to this chat
        const actualStickyPattern = `entropy_sticky_${chatId}_`;
        const actualStickyKeys = Object.keys(allData)
          .filter(key => key.startsWith(actualStickyPattern));
        
        const actualStickyIds = actualStickyKeys.map(key => 
          key.replace(actualStickyPattern, '')
        );
        
        console.log(`[Entropy] 📝 Chat ${chatId} should have: [${actualStickyIds.join(', ')}]`);
        
        // Update if different
        if (JSON.stringify(currentIndex.sort()) !== JSON.stringify(actualStickyIds.sort())) {
          console.log(`[Entropy] ⚠️ Fixing corrupted index for chat ${chatId}`);
          console.log(`[Entropy] - Removing: [${currentIndex.filter(id => !actualStickyIds.includes(id)).join(', ')}]`);
          console.log(`[Entropy] - Adding: [${actualStickyIds.filter(id => !currentIndex.includes(id)).join(', ')}]`);
          updates[chatKey] = actualStickyIds;
        } else {
          console.log(`[Entropy] ✅ Chat ${chatId} index is correct`);
        }
      });
      
      // Apply all updates
      if (Object.keys(updates).length > 0) {
        console.log(`[Entropy] 💾 Applying ${Object.keys(updates).length} index fixes...`);
        chrome.storage.local.set(updates, () => {
          console.log(`[Entropy] ✅ Storage cleanup complete!`);
          resolve();
        });
      } else {
        console.log(`[Entropy] ✅ No cleanup needed - all indices are correct`);
        resolve();
      }
    });
  });
}

// ========== Complete Storage Rebuild Function ==========
async function rebuildAllChatIndices() {
  console.log(`[Entropy] 🚨 REBUILDING ALL CHAT INDICES FROM SCRATCH 🚨`);
  
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (allData) => {
      // Find all actual sticky keys
      const stickyKeys = Object.keys(allData).filter(key => key.startsWith('entropy_sticky_'));
      console.log(`[Entropy] Found ${stickyKeys.length} total sticky keys in storage`);
      
      // Group stickies by chat ID
      const stickyByChatId = {};
      
      stickyKeys.forEach(stickyKey => {
        // Parse: entropy_sticky_{chatId}_{stickyId}
        const prefix = 'entropy_sticky_';
        const afterPrefix = stickyKey.substring(prefix.length);
        
        // Find the last underscore to separate chatId from stickyId
        const lastUnderscore = afterPrefix.lastIndexOf('_');
        if (lastUnderscore > 0) {
          const chatId = afterPrefix.substring(0, lastUnderscore);
          const stickyId = afterPrefix.substring(lastUnderscore + 1);
          
          // Verify the sticky data actually exists and is valid
          const stickyData = allData[stickyKey];
          if (stickyData && stickyData.id === stickyId) {
            if (!stickyByChatId[chatId]) stickyByChatId[chatId] = [];
            stickyByChatId[chatId].push(stickyId);
            console.log(`[Entropy] ✅ Verified sticky ${stickyId} for chat ${chatId}`);
          } else {
            console.log(`[Entropy] ⚠️ Invalid/corrupted sticky data for ${stickyKey}, skipping`);
          }
        }
      });
      
      console.log(`[Entropy] Found stickies for ${Object.keys(stickyByChatId).length} different chats:`);
      Object.keys(stickyByChatId).forEach(chatId => {
        console.log(`[Entropy] - Chat ${chatId}: ${stickyByChatId[chatId].length} stickies [${stickyByChatId[chatId].join(', ')}]`);
      });
      
      // Rebuild all chat indices
      const updates = {};
      Object.keys(stickyByChatId).forEach(chatId => {
        const chatKey = `entropy_chat_${chatId}`;
        const correctStickyIds = stickyByChatId[chatId];
        updates[chatKey] = correctStickyIds;
        console.log(`[Entropy] Setting ${chatKey} = [${correctStickyIds.join(', ')}]`);
      });
      
      // Remove any chat indices that don't have corresponding stickies
      const chatKeys = Object.keys(allData).filter(key => key.startsWith('entropy_chat_'));
      chatKeys.forEach(chatKey => {
        const chatId = chatKey.replace('entropy_chat_', '');
        if (!stickyByChatId[chatId]) {
          console.log(`[Entropy] Removing orphaned chat index: ${chatKey}`);
          chrome.storage.local.remove([chatKey]);
        }
      });
      
      // Apply all updates
      if (Object.keys(updates).length > 0) {
        console.log(`[Entropy] 💾 Rebuilding ${Object.keys(updates).length} chat indices...`);
        chrome.storage.local.set(updates, () => {
          console.log(`[Entropy] ✅ Complete storage rebuild finished!`);
          resolve();
        });
      } else {
        console.log(`[Entropy] ✅ No chat indices to rebuild`);
        resolve();
      }
    });
  });
}

// Debug function to verify storage state after operations
async function verifyStorageState(operation = "unknown") {
  const currentChatId = getCurrentChatId();
  console.log(`[Entropy] 🔍 STORAGE VERIFICATION AFTER ${operation.toUpperCase()}`);
  
  chrome.storage.local.get(null, (allData) => {
    // Check what stickies exist for current chat
    const currentChatStickyPattern = `entropy_sticky_${currentChatId}_`;
    const actualStickyKeys = Object.keys(allData)
      .filter(key => key.startsWith(currentChatStickyPattern));
    
    console.log(`[Entropy] Storage has ${actualStickyKeys.length} stickies for current chat:`);
    actualStickyKeys.forEach(key => {
      const stickyId = key.replace(currentChatStickyPattern, '');
      console.log(`[Entropy] - Storage: ${stickyId}`);
    });
    
    // Check what's in memory
    const memoryStickies = StickyNote.allNotes.map(n => n.data.id);
    console.log(`[Entropy] Memory has ${memoryStickies.length} stickies: [${memoryStickies.join(', ')}]`);
    
    // Check chat index
    const chatKey = `entropy_chat_${currentChatId}`;
    const chatIndex = allData[chatKey] || [];
    console.log(`[Entropy] Chat index has ${chatIndex.length} stickies: [${chatIndex.join(', ')}]`);
    
    // Check for mismatches
    const storageIds = actualStickyKeys.map(key => key.replace(currentChatStickyPattern, ''));
    const allMatch = JSON.stringify(storageIds.sort()) === JSON.stringify(memoryStickies.sort()) && 
                     JSON.stringify(storageIds.sort()) === JSON.stringify(chatIndex.sort());
    
    if (allMatch) {
      console.log(`[Entropy] ✅ Storage, memory, and index are all synchronized`);
    } else {
      console.log(`[Entropy] ⚠️ MISMATCH DETECTED:`);
      console.log(`[Entropy] - Storage: [${storageIds.join(', ')}]`);
      console.log(`[Entropy] - Memory: [${memoryStickies.join(', ')}]`);
      console.log(`[Entropy] - Index: [${chatIndex.join(', ')}]`);
    }
  });
}

// Only load stickies for the *current* chat
async function loadStickiesForPage() {
  const currentChatId = getCurrentChatId();
  const currentUrl = window.location.href;
  debugLog(`Loading stickies for chat ${currentChatId}, URL: ${currentUrl}`);
  
  // First purge any ghost stickies
  await purgeGhostStickies();
  
  // COMPLETELY IGNORE the corrupted chat index and rebuild from scratch
  chrome.storage.local.get(null, async (allData) => {
    // Find ALL sticky keys that actually belong to the current chat
    const currentChatStickyPattern = `entropy_sticky_${currentChatId}_`;
    const actualCurrentChatStickyKeys = Object.keys(allData)
      .filter(key => key.startsWith(currentChatStickyPattern));
    
    debugLog(`Found ${actualCurrentChatStickyKeys.length} stickies for current chat`);
    
    // Extract the sticky IDs
    const actualStickyIds = actualCurrentChatStickyKeys.map(key => 
      key.replace(currentChatStickyPattern, '')
    );
    
    // Load ONLY these legitimate stickies that have valid data
    const loadedStickyIds = [];
    
    for (const stickyId of actualStickyIds) {
      const stickyKey = `entropy_sticky_${currentChatId}_${stickyId}`;
      const stickyData = allData[stickyKey];
      
      // Only load if the sticky data exists and is valid
      if (stickyData && stickyData.id === stickyId && stickyData.content) {
        debugLog(`Loading sticky ${stickyId}`);
        const note = new StickyNote(stickyData);
        note.create();
        loadedStickyIds.push(stickyId);
      } else {
        debugLog(`Skipping invalid or missing sticky ${stickyId}`);
      }
    }
    
    // Clean up any invalid storage entries that didn't load
    const keysToRemove = actualCurrentChatStickyKeys.filter(key => {
      const stickyId = key.replace(currentChatStickyPattern, '');
      return !loadedStickyIds.includes(stickyId);
    });
    
    if (keysToRemove.length > 0) {
      debugLog(`Cleaning up ${keysToRemove.length} invalid sticky entries`);
      chrome.storage.local.remove(keysToRemove);
    }
    
    // Completely replace the corrupted chat index with the clean one
    const chatK = chatKey();
    chrome.storage.local.set({ [chatK]: loadedStickyIds });
    
    log(`Loaded ${loadedStickyIds.length} stickies for current chat`);
    
    // Restore stacks after all notes are loaded
    setTimeout(() => {
      debugLog(`Starting stack restoration for chat ${currentChatId}`);
      StickyNote.restoreStacksFromStorage();
    }, 200);
  });
}

function removeAllStickiesFromDOM() {
  debugLog(`Removing all stickies from DOM and clearing memory`);
  
  // Remove all DOM elements
  const stickyElements = document.querySelectorAll('.gpt-response');
  stickyElements.forEach(el => el.remove());
  
  // Clear all in-memory data structures
  StickyNote.allNotes = [];
  StickyNote.stacks = {};
  
  debugLog(`DOM and memory cleanup complete`);
}

// ========== Create new sticky from selection ==========
function createStickyFromSelection(text, rect, range) {
  range = range || (window.getSelection() && window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0) : null);
  let anchorElem = range ? range.startContainer.parentElement : document.body;
  // Find a suitable anchor (avoid text nodes, prefer block elements)
  while (anchorElem && anchorElem.nodeType === 1 && anchorElem.offsetParent === null) {
    anchorElem = anchorElem.parentElement;
  }
  if (!anchorElem) anchorElem = document.body;

  // Assign a unique anchor id if not present
  let anchorId = anchorElem.getAttribute('data-entropy-anchor');
  if (!anchorId) {
    anchorId = 'entropy-anchor-' + Date.now() + '-' + Math.floor(Math.random()*10000);
    anchorElem.setAttribute('data-entropy-anchor', anchorId);
  }
  // Ensure anchor is positioned
  const computedStyle = window.getComputedStyle(anchorElem);
  if (computedStyle.position === 'static') {
    anchorElem.style.position = 'relative';
  }
  const anchorRect = anchorElem.getBoundingClientRect();
  const relTopPx = (rect.bottom - anchorRect.top) + 10;
  const relLeftPx = (rect.left - anchorRect.left) + rect.width + 12;
  const relTopRatio = relTopPx / anchorRect.height;
  const relLeftRatio = relLeftPx / anchorRect.width;

  const anchorText = anchorElem.textContent;

  const stickyData = {
    id: `chat_${Date.now()}`,
    url: window.location.href,
    anchorId,
    anchorText,
    relTopRatio,
    relLeftRatio,
    position: {
      top: relTopPx + 'px',
      left: relLeftPx + 'px'
    },
    dimensions: { width: '420px', height: '320px' },
    color: 'rgba(247, 245, 158, 0.85)', // Mild sticky-note yellow
    title: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
    zIndex: 1000,
    stackId: null,
    stackIndex: 0,
    content: {
      context: text,
      chatHistory: [],
      isMinimized: false
    },
    timestamp: Date.now(),
    lastModified: Date.now()
  };
  const note = new StickyNote(stickyData);
  note.create();
  note.save();
}

// ========== UI: selection handler for entertain button ==========
document.addEventListener('mouseup', () => {
  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString().trim();
    if (!text) return;
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    // Remove old button
    document.getElementById('inline-comment-btn')?.remove();
    const commentBtn = document.createElement('button');
    commentBtn.innerText = 'entertain';
    commentBtn.id = 'inline-comment-btn';
    Object.assign(commentBtn.style, {
      position: 'absolute',
      top: `${rect.bottom + document.documentElement.scrollTop}px`,
      left: `${rect.left + document.documentElement.scrollLeft}px`,
      zIndex: 2147483647,
      background: '#f0f0f0',
      border: '1px solid #aaa',
      padding: '4px 6px',
      cursor: 'pointer',
      color: '#000'
    });
    document.body.appendChild(commentBtn);
    commentBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      commentBtn.remove();
      // Pass range and rect before clearing selection
      createStickyFromSelection(text, rect, range);
      window.getSelection()?.removeAllRanges();
    });
  }, 100);
});

// ========== SPA Navigation watcher ==========
let lastChatId = getCurrentChatId();
let lastUrl = window.location.href;
debugLog(`Initial chat ID: ${lastChatId}, URL: ${lastUrl}`);

setInterval(() => {
  const currentUrl = window.location.href;
  const chatId = getCurrentChatId();
  
  // Check if either the chat ID or the full URL has changed
  if (chatId !== lastChatId || currentUrl !== lastUrl) {
    debugLog(`Navigation detected: ${lastChatId} → ${chatId}`);
    debugLog(`URL changed: ${lastUrl} → ${currentUrl}`);
    
    lastChatId = chatId;
    lastUrl = currentUrl;
    
    debugLog(`Clearing stickies and loading for new chat...`);
    removeAllStickiesFromDOM();
    
    // Small delay to ensure page is ready
    setTimeout(() => {
      loadStickiesForPage();
    }, 100);
  }
}, 200); // Check more frequently

// ========== On page load ==========
window.addEventListener('DOMContentLoaded', async () => {
  log('Entropy extension initialized');
  if (DEBUG_MODE) {
    log('Debug mode enabled');
    await rebuildAllChatIndices();
  }
  debugStorageForCurrentChat();
  removeAllStickiesFromDOM();
  loadStickiesForPage();
});

// ========== Optional: Cleanup old stickies ==========
async function cleanupOldStickies() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  chrome.storage.local.get(null, data => {
    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith('entropy_sticky_') && val.timestamp < thirtyDaysAgo) {
        chrome.storage.local.remove(key);
      }
    }
  });
}
cleanupOldStickies();

// ========== Ghost Sticky Purge Function ==========
async function purgeGhostStickies() {
  const currentChatId = getCurrentChatId();
  debugLog(`Purging ghost stickies for chat ${currentChatId}`);
  
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (allData) => {
      // Get the current chat index
      const chatKey = `entropy_chat_${currentChatId}`;
      const chatIndex = allData[chatKey] || [];
      
      // Find all sticky keys for current chat
      const currentChatStickyPattern = `entropy_sticky_${currentChatId}_`;
      const actualStickyKeys = Object.keys(allData)
        .filter(key => key.startsWith(currentChatStickyPattern));
      
      debugLog(`Chat index: ${chatIndex.length} entries, Storage: ${actualStickyKeys.length} keys`);
      
      const keysToRemove = [];
      const validStickyIds = [];
      
      // Check each sticky key in storage
      actualStickyKeys.forEach(stickyKey => {
        const stickyId = stickyKey.replace(currentChatStickyPattern, '');
        const stickyData = allData[stickyKey];
        
        // A sticky is valid if it has valid data structure and is referenced in the chat index
        const hasValidData = stickyData && stickyData.id === stickyId;
        const isInIndex = chatIndex.includes(stickyId);
        
        if (!hasValidData || !isInIndex) {
          debugLog(`Ghost sticky detected: ${stickyId}`);
          keysToRemove.push(stickyKey);
        } else {
          validStickyIds.push(stickyId);
        }
      });
      
      if (keysToRemove.length > 0 || validStickyIds.length !== chatIndex.length) {
        log(`Cleaning up ${keysToRemove.length} ghost stickies`);
        
        // Remove ghost storage keys
        if (keysToRemove.length > 0) {
          chrome.storage.local.remove(keysToRemove, () => {
            // Update chat index to only include valid stickies
            chrome.storage.local.set({ [chatKey]: validStickyIds }, () => {
              debugLog(`Ghost purge complete. Valid stickies: ${validStickyIds.length}`);
              resolve();
            });
          });
        } else {
          // Just update the chat index
          chrome.storage.local.set({ [chatKey]: validStickyIds }, () => {
            debugLog(`Ghost purge complete. Valid stickies: ${validStickyIds.length}`);
            resolve();
          });
        }
      } else {
        debugLog(`No ghost stickies found`);
        resolve();
      }
    });
  });
}

// Add minimap functionality
class MinimapPanel {
  constructor() {
    this.element = null;
    this.isVisible = true;
    this.isFullscreen = false;
    this.isResizing = false;
    this.defaultWidth = 250;
    this.defaultHeight = 180;
    this.fullscreenWidth = Math.min(800, window.innerWidth * 0.8);
    this.fullscreenHeight = Math.min(600, window.innerHeight * 0.8);
    this.currentWidth = this.defaultWidth;
    this.currentHeight = this.defaultHeight;
    
    this.createMinimap();
    this.updateMinimap();
    
    // Update minimap when stickies change
    setInterval(() => this.updateMinimap(), 2000);
    
    // Update on window resize
    window.addEventListener('resize', () => this.updateMinimap());
  }

  createMinimap() {
    this.element = document.createElement('div');
    this.element.className = 'entropy-minimap';
    this.updateMinimapStyles();

    const header = document.createElement('div');
    header.style.cssText = `
      color: white;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
    `;
    header.innerHTML = `
      <span>Sticky Notes Map</span>
      <div class="minimap-controls">
        <button class="minimap-fullscreen" style="background: none; border: none; color: white; cursor: pointer; font-size: 14px; margin-right: 5px;" title="Toggle Fullscreen">⛶</button>
        <button class="minimap-toggle" style="background: none; border: none; color: white; cursor: pointer; font-size: 14px;" title="Minimize/Maximize">−</button>
      </div>
    `;

    this.mapContainer = document.createElement('div');
    this.updateMapContainerStyles();

    // Resize handle
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.style.cssText = `
      position: absolute;
      bottom: 0;
      right: 0;
      width: 15px;
      height: 15px;
      background: linear-gradient(-45deg, transparent 30%, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.3) 70%, transparent 70%);
      cursor: nw-resize;
      border-radius: 0 0 8px 0;
    `;

    this.element.appendChild(header);
    this.element.appendChild(this.mapContainer);
    this.element.appendChild(this.resizeHandle);
    document.body.appendChild(this.element);

    this.setupEventListeners(header);
  }

  updateMinimapStyles() {
    const baseStyles = `
      position: fixed;
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid #333;
      border-radius: 8px;
      z-index: 999999;
      padding: 10px;
      backdrop-filter: blur(8px);
      transition: all 0.3s ease;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    if (this.isFullscreen) {
      this.element.style.cssText = baseStyles + `
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${this.fullscreenWidth}px;
        height: ${this.fullscreenHeight}px;
        border-color: #4CAF50;
      `;
    } else {
      this.element.style.cssText = baseStyles + `
        top: 20px;
        right: 20px;
        width: ${this.currentWidth}px;
        height: ${this.currentHeight}px;
      `;
    }
  }

  updateMapContainerStyles() {
    const containerHeight = this.isFullscreen 
      ? this.fullscreenHeight - 60 
      : this.currentHeight - 60;
    
    this.mapContainer.style.cssText = `
      width: 100%;
      height: ${containerHeight}px;
      position: relative;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
  }

  setupEventListeners(header) {
    // Toggle visibility
    header.querySelector('.minimap-toggle').addEventListener('click', () => {
      this.isVisible = !this.isVisible;
      this.mapContainer.style.display = this.isVisible ? 'block' : 'none';
      this.resizeHandle.style.display = this.isVisible ? 'block' : 'none';
      header.querySelector('.minimap-toggle').textContent = this.isVisible ? '−' : '+';
    });

    // Toggle fullscreen
    header.querySelector('.minimap-fullscreen').addEventListener('click', () => {
      this.isFullscreen = !this.isFullscreen;
      this.updateMinimapStyles();
      this.updateMapContainerStyles();
      this.updateMinimap();
      
      // Update fullscreen button
      const fullscreenBtn = header.querySelector('.minimap-fullscreen');
      fullscreenBtn.textContent = this.isFullscreen ? '⛶' : '⛶';
      fullscreenBtn.style.color = this.isFullscreen ? '#4CAF50' : 'white';
    });

    // Dragging functionality
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    header.addEventListener('mousedown', (e) => {
      if (this.isFullscreen) return;
      isDragging = true;
      const rect = this.element.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || this.isFullscreen) return;
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      this.element.style.right = 'auto';
      this.element.style.left = `${Math.max(0, Math.min(x, window.innerWidth - this.currentWidth))}px`;
      this.element.style.top = `${Math.max(0, Math.min(y, window.innerHeight - this.currentHeight))}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      header.style.cursor = 'move';
    });

    // Resizing functionality
    this.resizeHandle.addEventListener('mousedown', (e) => {
      if (this.isFullscreen) return;
      e.stopPropagation();
      this.isResizing = true;
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = this.currentWidth;
      const startHeight = this.currentHeight;

      const handleResize = (e) => {
        if (!this.isResizing) return;
        this.currentWidth = Math.max(200, startWidth + (e.clientX - startX));
        this.currentHeight = Math.max(150, startHeight + (e.clientY - startY));
        this.updateMinimapStyles();
        this.updateMapContainerStyles();
        this.updateMinimap();
      };

      const stopResize = () => {
        this.isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
      };

      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
    });

    // Close fullscreen on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isFullscreen) {
        this.isFullscreen = false;
        this.updateMinimapStyles();
        this.updateMapContainerStyles();
        this.updateMinimap();
        header.querySelector('.minimap-fullscreen').style.color = 'white';
      }
    });
  }

  updateMinimap() {
    if (!this.mapContainer) return;

    // Clear existing dots
    this.mapContainer.innerHTML = '';

    // Get all sticky notes
    const stickies = StickyNote.allNotes.filter(note => note.element && note.element.style.display !== 'none');
    
    if (stickies.length === 0) return;

    const mapWidth = this.mapContainer.offsetWidth;
    const mapHeight = this.mapContainer.offsetHeight;
    const dotSize = this.isFullscreen ? 12 : 8;
    const showLabels = this.isFullscreen;
    
    // Create conversation timeline structure
    const timelineData = this.createConversationTimeline(stickies, mapWidth, mapHeight);
    
    // Draw the main conversation timeline (vertical backbone)
    this.drawMainTimeline(timelineData);
    
    // Draw branches and sticky nodes
    this.drawStickyBranches(timelineData, dotSize, showLabels);

    // Add current viewport indicator
    this.drawViewportIndicator(timelineData);
  }

  createConversationTimeline(stickies, mapWidth, mapHeight) {
    // Sort stickies by their position in the conversation (scroll position as proxy)
    const sortedStickies = [...stickies].sort((a, b) => {
      const rectA = a.element.getBoundingClientRect();
      const rectB = b.element.getBoundingClientRect();
      return (rectA.top + window.scrollY) - (rectB.top + window.scrollY);
    });

    // Calculate timeline parameters
    const timelineX = this.isFullscreen ? 100 : 50; // X position of main timeline
    const timelineStartY = 30;
    const timelineEndY = mapHeight - 30;
    const timelineHeight = timelineEndY - timelineStartY;
    
    // Group stickies by stacks and calculate positions
    const stickyGroups = this.groupStickiesByStack(sortedStickies);
    const timelineNodes = [];
    
    stickyGroups.forEach((group, index) => {
      // Calculate Y position along timeline based on conversation order
      const progress = stickyGroups.length > 1 ? index / (stickyGroups.length - 1) : 0.5;
      const timelineY = timelineStartY + (progress * timelineHeight);
      
      // Calculate branch positions for stickies in this group
      const branchLength = this.isFullscreen ? 150 : 80;
      const branchStartX = timelineX + 20;
      const branchSpacing = this.isFullscreen ? 40 : 25;
      
      group.forEach((sticky, stackIndex) => {
        const branchX = branchStartX + (stackIndex * branchSpacing);
        
        timelineNodes.push({
          sticky: sticky,
          timelineX: timelineX,
          timelineY: timelineY,
          branchX: branchX,
          branchY: timelineY,
          isMainNode: stackIndex === 0, // First sticky in group connects to timeline
          stackIndex: stackIndex,
          groupIndex: index
        });
      });
    });

    return {
      timelineX,
      timelineStartY,
      timelineEndY,
      timelineHeight,
      nodes: timelineNodes,
      mapWidth,
      mapHeight
    };
  }

  groupStickiesByStack(stickies) {
    const groups = [];
    const processed = new Set();
    
    stickies.forEach(sticky => {
      if (processed.has(sticky.data.id)) return;
      
      const group = [sticky];
      processed.add(sticky.data.id);
      
      // Find stickies in the same stack
      if (sticky.stackId) {
        stickies.forEach(otherSticky => {
          if (processed.has(otherSticky.data.id)) return;
          if (sticky.stackId === otherSticky.stackId) {
            group.push(otherSticky);
            processed.add(otherSticky.data.id);
          }
        });
      }
      
      groups.push(group);
    });
    
    return groups;
  }

  drawMainTimeline(timelineData) {
    const { timelineX, timelineStartY, timelineEndY } = timelineData;
    
    // Main conversation timeline (vertical line)
    const timeline = document.createElement('div');
    timeline.style.cssText = `
      position: absolute;
      left: ${timelineX}px;
      top: ${timelineStartY}px;
      width: 3px;
      height: ${timelineEndY - timelineStartY}px;
      background: linear-gradient(180deg, #4CAF50, #2196F3, #9C27B0);
      border-radius: 2px;
      z-index: 2;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
    `;
    this.mapContainer.appendChild(timeline);
    
    // Add timeline markers
    timelineData.nodes.forEach(node => {
      if (node.isMainNode) {
        const marker = document.createElement('div');
        marker.style.cssText = `
          position: absolute;
          left: ${timelineX - 4}px;
          top: ${node.timelineY - 4}px;
          width: 11px;
          height: 11px;
          background: white;
          border: 2px solid #4CAF50;
          border-radius: 50%;
          z-index: 3;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        `;
        this.mapContainer.appendChild(marker);
      }
    });
  }

  drawStickyBranches(timelineData, dotSize, showLabels) {
    const { nodes } = timelineData;
    
    nodes.forEach(node => {
      const { sticky, timelineX, timelineY, branchX, branchY, isMainNode, stackIndex } = node;
      
      // Draw branch line from timeline to sticky
      if (isMainNode) {
        // Direct connection from timeline to first sticky
        this.drawBranchLine(timelineX + 10, timelineY, branchX - 5, branchY, sticky.color || '#14532d');
      } else {
        // Connection from previous sticky in stack
        const prevNode = nodes.find(n => 
          n.groupIndex === node.groupIndex && n.stackIndex === stackIndex - 1
        );
        if (prevNode) {
          this.drawBranchLine(prevNode.branchX + dotSize/2, prevNode.branchY, branchX - 5, branchY, sticky.color || '#14532d');
        }
      }
      
      // Draw sticky node
      this.drawStickyNode(sticky, branchX, branchY, dotSize, showLabels);
    });
  }

  drawBranchLine(x1, y1, x2, y2, color) {
    const line = document.createElement('div');
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    
    line.style.cssText = `
      position: absolute;
      left: ${x1}px;
      top: ${y1}px;
      width: ${length}px;
      height: 2px;
      background: linear-gradient(90deg, ${color}CC, ${color}80);
      transform-origin: 0 50%;
      transform: rotate(${angle}deg);
      z-index: 1;
      pointer-events: none;
      border-radius: 1px;
    `;
    
    this.mapContainer.appendChild(line);
  }

  drawStickyNode(sticky, x, y, dotSize, showLabels) {
    const dotContainer = document.createElement('div');
    dotContainer.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y - dotSize/2}px;
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: all 0.2s ease;
      z-index: 10;
    `;

    const dot = document.createElement('div');
    dot.style.cssText = `
      width: ${dotSize}px;
      height: ${dotSize}px;
      border-radius: 50%;
      background: ${sticky.color || '#14532d'};
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s ease;
      flex-shrink: 0;
    `;
    
    dotContainer.appendChild(dot);

    // Add label in fullscreen mode
    if (showLabels) {
      const label = document.createElement('span');
      label.textContent = sticky.title || 'Untitled';
      label.style.cssText = `
        color: white;
        font-size: 11px;
        font-weight: 500;
        margin-left: 8px;
        background: rgba(0, 0, 0, 0.8);
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(4px);
      `;
      dotContainer.appendChild(label);
    }
    
    dotContainer.title = sticky.title || 'Untitled';
    
    // Click to navigate
    dotContainer.addEventListener('click', () => {
      sticky.element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
      
      // Highlight the sticky briefly
      const originalBorder = sticky.element.style.border;
      sticky.element.style.border = '3px solid #ff6b6b';
      setTimeout(() => {
        sticky.element.style.border = originalBorder;
      }, 1000);
    });
    
    // Hover effects
    dotContainer.addEventListener('mouseenter', () => {
      dot.style.transform = 'scale(1.4)';
      dotContainer.style.zIndex = '20';
      if (showLabels) {
        dotContainer.style.transform = 'scale(1.05)';
      }
    });
    
    dotContainer.addEventListener('mouseleave', () => {
      dot.style.transform = 'scale(1)';
      dotContainer.style.zIndex = '10';
      if (showLabels) {
        dotContainer.style.transform = 'scale(1)';
      }
    });
    
    this.mapContainer.appendChild(dotContainer);
  }

  drawViewportIndicator(timelineData) {
    // Calculate current viewport position relative to conversation
    const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1);
    const indicatorY = timelineData.timelineStartY + (scrollPercent * timelineData.timelineHeight);
    
    const viewport = document.createElement('div');
    viewport.style.cssText = `
      position: absolute;
      left: ${timelineData.timelineX - 15}px;
      top: ${indicatorY - 2}px;
      width: 33px;
      height: 4px;
      background: rgba(255, 193, 7, 0.8);
      border: 1px solid #FFC107;
      border-radius: 2px;
      z-index: 5;
      pointer-events: none;
      box-shadow: 0 0 8px rgba(255, 193, 7, 0.4);
    `;
    
    this.mapContainer.appendChild(viewport);
  }
}

// Initialize minimap when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => new MinimapPanel(), 1000);
  });
} else {
  setTimeout(() => new MinimapPanel(), 1000);
}
