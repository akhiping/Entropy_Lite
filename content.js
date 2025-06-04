// == Entropy Lite Sticky Notes: Per-Chat, Persistent, Non-Following ==

console.log("✅ Entropy Lite loaded");

// ========== Helpers ==========

// Returns current chat ID (from /c/{id}), or uses pathname as fallback
function getCurrentChatId() {
  const match = window.location.pathname.match(/\/c\/([\w-]+)/);
  return match ? match[1] : window.location.pathname;
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
    this.color = stickyData.color || '#ffffff';
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
          <span class="stack-arrows" style="display:none">
            <button class="stack-left">⟨</button>
            <button class="stack-right">⟩</button>
          </span>
        </div>
        <div class="title-bar">
          <input type="text" class="title-input" value="${this.title}" />
          <div class="color-picker">
            <div class="color-option" data-color="#ffffff" style="background: #ffffff"></div>
            <div class="color-option" data-color="#ffebee" style="background: #ffebee"></div>
            <div class="color-option" data-color="#e8f5e9" style="background: #e8f5e9"></div>
            <div class="color-option" data-color="#e3f2fd" style="background: #e3f2fd"></div>
            <div class="color-option" data-color="#fff3e0" style="background: #fff3e0"></div>
          </div>
        </div>
        <div class="context-label"><strong>Context:</strong> ${content.context}</div>
      </div>
      <div class="chat-history" style="padding:8px;${content.isMinimized ? 'display:none' : ''}"></div>
      <div class="chat-input" style="padding:8px;display:${content.isMinimized ? 'none' : 'flex'};gap:5px;">
        <input type="text" class="chat-message-input" style="flex:1" placeholder="Ask something relevant..." />
        <button class="send-btn">➤</button>
      </div>
      <div class="resize-handle" style="width:18px;height:18px;position:absolute;right:0;bottom:0;cursor:se-resize;background:#ddd"></div>
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
      box.style.width = '340px';
      box.style.height = '220px';
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
      console.log(`[Entropy] Sticky ${this.data.id} is part of stack ${this.stackId}, skipping individual positioning`);
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
    this.adjustLayout();
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
    console.log(`[Entropy] 🗑️ REMOVING STICKY ${this.data.id} from chat ${getCurrentChatId()}`);
    
    const stickyStorageKey = stickyKey(this.data.id);
    const chatK = chatKey();
    
    // Remove from stack if it's part of one
    if (this.stackId && StickyNote.stacks[this.stackId]) {
      console.log(`[Entropy] Removing ${this.data.id} from stack ${this.stackId}`);
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
          console.log(`[Entropy] Removed empty stack ${this.stackId}`);
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
          console.log(`[Entropy] Unstacked last remaining note in ${this.stackId}`);
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
          console.log(`[Entropy] Updated stack ${this.stackId} with ${stack.length} remaining notes`);
        }
      }
    }
    
    // Remove from DOM
    if (this.element) {
      this.element.remove();
      console.log(`[Entropy] Removed sticky ${this.data.id} from DOM`);
    }
    
    // Remove from allNotes array
    const noteIndex = StickyNote.allNotes.findIndex(n => n.data.id === this.data.id);
    if (noteIndex > -1) {
      StickyNote.allNotes.splice(noteIndex, 1);
      console.log(`[Entropy] Removed sticky ${this.data.id} from memory (${StickyNote.allNotes.length} remaining)`);
    }
    
    // AGGRESSIVE STORAGE REMOVAL - Remove from both chat index AND storage, then verify
    console.log(`[Entropy] Starting aggressive removal of ${this.data.id}`);
    console.log(`[Entropy] Removing from storage key: ${stickyStorageKey}`);
    console.log(`[Entropy] Removing from chat index: ${chatK}`);
    
    // Step 1: Remove from chat index first
    chrome.storage.local.get([chatK], (chatResult) => {
      const currentIndex = chatResult[chatK] || [];
      const newIndex = currentIndex.filter(id => id !== this.data.id);
      console.log(`[Entropy] Chat index before: [${currentIndex.join(', ')}]`);
      console.log(`[Entropy] Chat index after: [${newIndex.join(', ')}]`);
      
      chrome.storage.local.set({ [chatK]: newIndex }, () => {
        console.log(`[Entropy] ✅ Updated chat index`);
        
        // Step 2: Remove the sticky data itself
        chrome.storage.local.remove([stickyStorageKey], () => {
          console.log(`[Entropy] ✅ Attempted sticky removal from ${stickyStorageKey}`);
          
          // Step 3: VERIFY the removal actually worked
          setTimeout(() => {
            chrome.storage.local.get([stickyStorageKey, chatK], (verifyResult) => {
              const stickyStillExists = !!verifyResult[stickyStorageKey];
              const newChatIndex = verifyResult[chatK] || [];
              const stillInIndex = newChatIndex.includes(this.data.id);
              
              console.log(`[Entropy] 🔍 DELETION VERIFICATION:`);
              console.log(`[Entropy] - Sticky still in storage: ${stickyStillExists}`);
              console.log(`[Entropy] - Still in chat index: ${stillInIndex}`);
              console.log(`[Entropy] - Current chat index: [${newChatIndex.join(', ')}]`);
              
              if (stickyStillExists || stillInIndex) {
                console.log(`[Entropy] ⚠️ DELETION FAILED! Attempting aggressive cleanup...`);
                
                // Nuclear option: manually clean up
                const updates = {};
                if (stickyStillExists) {
                  updates[stickyStorageKey] = null; // Explicitly set to null
                }
                if (stillInIndex) {
                  // Force remove from chat index
                  const cleanedIndex = newChatIndex.filter(id => id !== this.data.id);
                  updates[chatK] = cleanedIndex;
                  console.log(`[Entropy] Forcing chat index cleanup: [${newChatIndex.join(', ')}] → [${cleanedIndex.join(', ')}]`);
                }
                
                chrome.storage.local.set(updates, () => {
                  console.log(`[Entropy] 💥 Applied nuclear cleanup`);
                  
                  // Final verification
                  setTimeout(() => {
                    chrome.storage.local.get([stickyStorageKey, chatK], (finalResult) => {
                      const finalStickyExists = !!finalResult[stickyStorageKey];
                      const finalIndex = finalResult[chatK] || [];
                      const finalStillInIndex = finalIndex.includes(this.data.id);
                      
                      console.log(`[Entropy] 🔍 FINAL VERIFICATION:`);
                      console.log(`[Entropy] - Sticky exists: ${finalStickyExists}`);
                      console.log(`[Entropy] - In index: ${finalStillInIndex}`);
                      console.log(`[Entropy] - Final index: [${finalIndex.join(', ')}]`);
                      
                      if (!finalStickyExists && !finalStillInIndex) {
                        console.log(`[Entropy] ✅ DELETION SUCCESSFUL!`);
                      } else {
                        console.log(`[Entropy] ❌ DELETION STILL FAILED!`);
                      }
                      
                      verifyStorageState("deletion");
                    });
                  }, 200);
                });
              } else {
                console.log(`[Entropy] ✅ DELETION SUCCESSFUL!`);
                verifyStorageState("deletion");
              }
            });
          }, 100);
        });
      });
    });
  }

  minimize() {
    const chatHistory = this.element.querySelector('.chat-history');
    const chatInput = this.element.querySelector('.chat-input');
    const minBtn = this.element.querySelector('.minimize-btn');
    chatHistory.style.display = 'none';
    chatInput.style.display = 'none';
    minBtn.textContent = '+';
  }
  restore() {
    const chatHistory = this.element.querySelector('.chat-history');
    const chatInput = this.element.querySelector('.chat-input');
    const minBtn = this.element.querySelector('.minimize-btn');
    chatHistory.style.display = 'block';
    chatInput.style.display = 'flex';
    minBtn.textContent = '—';
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
          e.target.classList.contains('stack-left') || e.target.classList.contains('stack-right')) {
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
      startW = box.offsetWidth;
      startH = box.offsetHeight;
      startX = e.clientX;
      startY = e.clientY;
      e.stopPropagation();
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const newWidth = Math.max(200, startW + (e.clientX - startX));
      const newHeight = Math.max(100, startH + (e.clientY - startY));
      box.style.width = newWidth + 'px';
      box.style.height = newHeight + 'px';
      this.adjustLayout();
      this.autoSave();
    });
    document.addEventListener('mouseup', () => {
      if (resizing) {
        resizing = false;
        this.save();
      }
    });

    // Close/minimize
    box.querySelector('.close-btn').onclick = () => this.remove();
    const minBtn = box.querySelector('.minimize-btn');
    minBtn.onclick = () => {
      if (minBtn.textContent === '—') this.minimize();
      else this.restore();
      this.autoSave();
    };

    // Chat logic with API integration
    const chatInput = box.querySelector('.chat-message-input');
    const sendBtn = box.querySelector('.send-btn');
    
    const sendMessage = () => {
      const question = chatInput.value.trim();
      if (!question) return;
      
      // Debug: Log what we're sending with more details
      console.log('[Entropy] Sending message:');
      console.log('Chat input element:', chatInput);
      console.log('Chat input value:', chatInput.value);
      console.log('Context:', this.data.content.context);
      console.log('Question:', question);
      console.log('Are they the same?', this.data.content.context === question);
      
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
        
        console.log('[Entropy] Sending to background:', messageData);
        
        chrome.runtime.sendMessage(messageData, (response) => {
          console.log('[Entropy] Received response:', response);
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
      [stackPositionKey]: {
        position: topPosition,
        stackId: stackId,
        lastUpdated: Date.now()
      }
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
    
    // Get the current stack position (should be the same for all notes in stack)
    const currentTopNote = StickyNote.allNotes.find(n => n.data.id === stack[stack.length - 1]);
    let stackPosition = null;
    if (currentTopNote && currentTopNote.element) {
      stackPosition = {
        top: currentTopNote.element.style.top,
        left: currentTopNote.element.style.left,
        width: currentTopNote.element.style.width,
        height: currentTopNote.element.style.height
      };
    }
    
    // Cycle through stack
    if (direction === 1) {
      stack.push(stack.shift());
    } else {
      stack.unshift(stack.pop());
    }
    
    StickyNote.stacks[this.stackId] = stack;
    this.saveStackToStorage(this.stackId);
    
    // Apply stack position to all notes and show only the new top
    stack.forEach((id, idx) => {
      const note = StickyNote.allNotes.find(n => n.data.id === id);
      if (note && note.element) {
        // Apply stack position to all notes
        if (stackPosition) {
          note.element.style.top = stackPosition.top;
          note.element.style.left = stackPosition.left;
          note.element.style.width = stackPosition.width;
          note.element.style.height = stackPosition.height;
          
          // Update the stored data to maintain stack position
          note.data.position = { top: stackPosition.top, left: stackPosition.left };
          note.data.dimensions = { width: stackPosition.width, height: stackPosition.height };
        }
        
        // Show only the top note
        note.element.style.display = (idx === stack.length - 1) ? 'block' : 'none';
        note.updateStackUI();
        
        // Bring top of stack to front
        if (idx === stack.length - 1) {
          note.bringToFront();
        }
        
        // Save the updated position
        note.save();
      }
    });
  }

  addMessage(role, content) {
    const chatHistory = this.element.querySelector('.chat-history');
    const div = document.createElement('div');
    div.className = role === 'user' ? 'user-msg' : 'bot-msg';
    div.textContent = (role === 'user' ? 'You: ' : '🤖: ') + content;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    this.autoSave();
  }

  initializeColorPicker() {
    const colorPicker = this.element.querySelector('.color-picker');
    const colorOptions = colorPicker.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.color = option.getAttribute('data-color');
        this.element.style.background = this.color;
        this.autoSave();
      });
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

  adjustLayout() {
    const chatHistory = this.element.querySelector('.chat-history');
    if (!chatHistory) return;
    
    const historyContent = chatHistory.scrollHeight;
    
    if (historyContent < 200) {
      chatHistory.style.height = historyContent + 'px';
    } else {
      chatHistory.style.height = '200px';
    }
    
    // Ensure chat history scrolls to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
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
  const currentChatId = getCurrentChatId();
  console.log(`[Entropy DEBUG] === STORAGE DEBUG FOR CHAT ${currentChatId} ===`);
  
  chrome.storage.local.get(null, (data) => {
    console.log(`[Entropy DEBUG] Total storage keys: ${Object.keys(data).length}`);
    
    // Show all chat indices
    const chatKeys = Object.keys(data).filter(key => key.startsWith('entropy_chat_'));
    console.log(`[Entropy DEBUG] Found ${chatKeys.length} chat indices:`);
    chatKeys.forEach(chatKey => {
      const chatId = chatKey.replace('entropy_chat_', '');
      const stickyIds = data[chatKey] || [];
      console.log(`[Entropy DEBUG] - Chat ${chatId}: ${stickyIds.length} stickies [${stickyIds.join(', ')}]`);
    });
    
    // Show all actual sticky keys
    const stickyKeys = Object.keys(data).filter(key => key.startsWith('entropy_sticky_'));
    console.log(`[Entropy DEBUG] Found ${stickyKeys.length} actual sticky keys:`);
    
    // Group by chat ID
    const stickyByChatId = {};
    stickyKeys.forEach(stickyKey => {
      const parts = stickyKey.split('_');
      if (parts.length >= 4) {
        const chatId = parts[2];
        const stickyId = parts.slice(3).join('_');
        if (!stickyByChatId[chatId]) stickyByChatId[chatId] = [];
        stickyByChatId[chatId].push(stickyId);
      }
    });
    
    Object.keys(stickyByChatId).forEach(chatId => {
      const isCurrentChat = chatId === currentChatId;
      console.log(`[Entropy DEBUG] - ${isCurrentChat ? '*** CURRENT *** ' : ''}Chat ${chatId}: ${stickyByChatId[chatId].length} actual stickies [${stickyByChatId[chatId].join(', ')}]`);
    });
    
    // Show current chat details
    const currentChatKey = `entropy_chat_${currentChatId}`;
    const currentChatIndex = data[currentChatKey] || [];
    const currentChatActualStickies = stickyByChatId[currentChatId] || [];
    
    console.log(`[Entropy DEBUG] === CURRENT CHAT ANALYSIS ===`);
    console.log(`[Entropy DEBUG] Chat index says: ${currentChatIndex.length} stickies [${currentChatIndex.join(', ')}]`);
    console.log(`[Entropy DEBUG] Actually stored: ${currentChatActualStickies.length} stickies [${currentChatActualStickies.join(', ')}]`);
    
    // Check for mismatches
    const indexMismatch = JSON.stringify(currentChatIndex.sort()) !== JSON.stringify(currentChatActualStickies.sort());
    if (indexMismatch) {
      console.log(`[Entropy DEBUG] ⚠️  MISMATCH DETECTED! Chat index is corrupted.`);
      console.log(`[Entropy DEBUG] Index has: [${currentChatIndex.join(', ')}]`);
      console.log(`[Entropy DEBUG] Storage has: [${currentChatActualStickies.join(', ')}]`);
    } else {
      console.log(`[Entropy DEBUG] ✅ Chat index matches actual storage`);
    }
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
  console.log(`[Entropy] === LOADING STICKIES FOR CHAT ${currentChatId} ===`);
  
  // First purge any ghost stickies
  await purgeGhostStickies();
  
  // COMPLETELY IGNORE the corrupted chat index and rebuild from scratch
  chrome.storage.local.get(null, async (allData) => {
    // Find ALL sticky keys that actually belong to the current chat
    const currentChatStickyPattern = `entropy_sticky_${currentChatId}_`;
    console.log(`[Entropy] Looking for stickies with pattern: ${currentChatStickyPattern}`);
    
    const actualCurrentChatStickyKeys = Object.keys(allData)
      .filter(key => key.startsWith(currentChatStickyPattern));
    
    console.log(`[Entropy] Found ${actualCurrentChatStickyKeys.length} actual sticky keys for current chat:`, actualCurrentChatStickyKeys);
    
    // Extract the sticky IDs
    const actualStickyIds = actualCurrentChatStickyKeys.map(key => 
      key.replace(currentChatStickyPattern, '')
    );
    
    console.log(`[Entropy] Extracted sticky IDs:`, actualStickyIds);
    
    // Load ONLY these legitimate stickies
    const loadedStickyIds = [];
    
    for (const stickyId of actualStickyIds) {
      const stickyKey = `entropy_sticky_${currentChatId}_${stickyId}`;
      const stickyData = allData[stickyKey];
      
      if (stickyData) {
        console.log(`[Entropy] ✅ Loading legitimate sticky ${stickyId} for chat ${currentChatId}`);
        const note = new StickyNote(stickyData);
        note.create();
        loadedStickyIds.push(stickyId);
      } else {
        console.log(`[Entropy] ❌ Sticky data missing for ${stickyId}`);
      }
    }
    
    // Completely replace the corrupted chat index with the clean one
    const chatK = chatKey();
    console.log(`[Entropy] 🧹 Replacing corrupted chat index ${chatK}`);
    console.log(`[Entropy] Old corrupted index: ${JSON.stringify(allData[chatK] || [])}`);
    console.log(`[Entropy] New clean index: ${JSON.stringify(loadedStickyIds)}`);
    
    chrome.storage.local.set({ [chatK]: loadedStickyIds });
    
    console.log(`[Entropy] ✅ Successfully loaded ${loadedStickyIds.length} legitimate stickies for chat ${currentChatId}`);
    
    // Restore stacks after all notes are loaded
    setTimeout(() => {
      console.log(`[Entropy] Starting stack restoration for chat ${currentChatId}...`);
      StickyNote.restoreStacksFromStorage();
    }, 200);
  });
}

function removeAllStickiesFromDOM() {
  console.log(`[Entropy] Removing all stickies from DOM and clearing memory`);
  
  // Remove all DOM elements
  const stickyElements = document.querySelectorAll('.gpt-response');
  console.log(`[Entropy] Found ${stickyElements.length} sticky elements to remove`);
  stickyElements.forEach(el => {
    console.log(`[Entropy] Removing sticky element with ID: ${el.dataset.entropyId}`);
    el.remove();
  });
  
  // Clear all in-memory data structures
  console.log(`[Entropy] Clearing ${StickyNote.allNotes.length} notes from memory`);
  StickyNote.allNotes = [];
  
  console.log(`[Entropy] Clearing ${Object.keys(StickyNote.stacks).length} stacks from memory`);
  StickyNote.stacks = {};
  
  console.log(`[Entropy] DOM and memory cleanup complete`);
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
    dimensions: { width: '350px', height: 'auto' },
    color: '#ffffff',
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
console.log(`[Entropy] Initial chat ID: ${lastChatId}`);

setInterval(() => {
  const chatId = getCurrentChatId();
  if (chatId !== lastChatId) {
    console.log(`[Entropy] === NAVIGATION DETECTED ===`);
    console.log(`[Entropy] Changed from chat ${lastChatId} to chat ${chatId}`);
    lastChatId = chatId;
    removeAllStickiesFromDOM();
    loadStickiesForPage();
  }
}, 400);

// ========== On page load ==========
window.addEventListener('DOMContentLoaded', async () => {
  console.log('[Entropy] DOMContentLoaded - starting page load');
  console.log('[Entropy] Running COMPLETE storage rebuild...');
  await rebuildAllChatIndices();
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
  console.log(`[Entropy] 👻 PURGING GHOST STICKIES FOR CHAT ${currentChatId}`);
  
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (allData) => {
      // Get the current chat index
      const chatKey = `entropy_chat_${currentChatId}`;
      const chatIndex = allData[chatKey] || [];
      
      // Find all sticky keys for current chat
      const currentChatStickyPattern = `entropy_sticky_${currentChatId}_`;
      const actualStickyKeys = Object.keys(allData)
        .filter(key => key.startsWith(currentChatStickyPattern));
      
      console.log(`[Entropy] Chat index references: [${chatIndex.join(', ')}]`);
      console.log(`[Entropy] Actual storage keys: ${actualStickyKeys.length}`);
      
      const keysToRemove = [];
      const validStickyIds = [];
      
      // Check each sticky key in storage
      actualStickyKeys.forEach(stickyKey => {
        const stickyId = stickyKey.replace(currentChatStickyPattern, '');
        const stickyData = allData[stickyKey];
        
        // A sticky is valid if:
        // 1. It has valid data structure
        // 2. It's referenced in the chat index
        const hasValidData = stickyData && stickyData.id === stickyId;
        const isInIndex = chatIndex.includes(stickyId);
        
        console.log(`[Entropy] Sticky ${stickyId}: validData=${hasValidData}, inIndex=${isInIndex}`);
        
        if (!hasValidData || !isInIndex) {
          console.log(`[Entropy] 👻 GHOST STICKY DETECTED: ${stickyId} - marking for removal`);
          keysToRemove.push(stickyKey);
        } else {
          console.log(`[Entropy] ✅ Valid sticky: ${stickyId}`);
          validStickyIds.push(stickyId);
        }
      });
      
      // Also check for IDs in chat index that don't have storage
      chatIndex.forEach(stickyId => {
        const stickyKey = `${currentChatStickyPattern}${stickyId}`;
        if (!allData[stickyKey]) {
          console.log(`[Entropy] 👻 GHOST INDEX ENTRY DETECTED: ${stickyId} (no storage)`);
          // This will be cleaned up when we rebuild the index
        }
      });
      
      if (keysToRemove.length > 0 || validStickyIds.length !== chatIndex.length) {
        console.log(`[Entropy] 💥 Cleaning up ghosts:`);
        console.log(`[Entropy] - Removing ${keysToRemove.length} ghost storage keys`);
        console.log(`[Entropy] - Updating chat index: [${chatIndex.join(', ')}] → [${validStickyIds.join(', ')}]`);
        
        // Remove ghost storage keys
        if (keysToRemove.length > 0) {
          chrome.storage.local.remove(keysToRemove, () => {
            // Update chat index to only include valid stickies
            chrome.storage.local.set({ [chatKey]: validStickyIds }, () => {
              console.log(`[Entropy] ✅ Ghost purge complete. Valid stickies: [${validStickyIds.join(', ')}]`);
              resolve();
            });
          });
        } else {
          // Just update the chat index
          chrome.storage.local.set({ [chatKey]: validStickyIds }, () => {
            console.log(`[Entropy] ✅ Ghost purge complete. Valid stickies: [${validStickyIds.join(', ')}]`);
            resolve();
          });
        }
      } else {
        console.log(`[Entropy] ✅ No ghost stickies found`);
        resolve();
      }
    });
  });
}
