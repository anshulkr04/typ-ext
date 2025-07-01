// Enhanced content script for Typewriter Pro

// Global variables
let focusedElement = null;
let typewriterInstance = null;

// Initialize content script
(function() {
  addFocusHighlighting();
  addKeyboardShortcuts();
  addVisualIndicators();
})();

// Enhanced focus highlighting
function addFocusHighlighting() {
  // Style for focused elements
  const style = document.createElement('style');
  style.textContent = `
    .typewriter-focused {
      outline: 2px solid #2563eb !important;
      outline-offset: 2px !important;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
      transition: all 0.2s ease !important;
    }
    
    .typewriter-typing {
      outline: 2px solid #10b981 !important;
      outline-offset: 2px !important;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2) !important;
      animation: typewriter-pulse 1.5s ease-in-out infinite !important;
    }
    
    @keyframes typewriter-pulse {
      0%, 100% { 
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2) !important;
      }
      50% { 
        box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.1) !important;
      }
    }
    
    .typewriter-indicator {
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    }
    
    .typewriter-indicator.show {
      transform: translateX(0);
    }
    
    .typewriter-indicator.typing {
      background: linear-gradient(135deg, #10b981, #059669);
    }
    
    .typewriter-indicator.paused {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }
  `;
  document.head.appendChild(style);

  // Track focus events
  document.addEventListener('focusin', handleFocusIn, true);
  document.addEventListener('focusout', handleFocusOut, true);
}

function handleFocusIn(e) {
  const element = e.target;
  
  // Check if element is typeable
  if (isTypeableElement(element)) {
    // Remove previous focus styling
    if (focusedElement) {
      focusedElement.classList.remove('typewriter-focused');
    }
    
    // Add focus styling to new element
    element.classList.add('typewriter-focused');
    focusedElement = element;
    
    // Show indicator
    showIndicator('Element ready for typing', 'ready');
  }
}

function handleFocusOut(e) {
  const element = e.target;
  
  if (element.classList.contains('typewriter-focused')) {
    element.classList.remove('typewriter-focused');
  }
  
  // Don't clear focusedElement immediately - keep it for potential typing
  setTimeout(() => {
    if (document.activeElement !== element && !isTypeableElement(document.activeElement)) {
      focusedElement = null;
      hideIndicator();
    }
  }, 100);
}

function isTypeableElement(element) {
  if (!element) return false;
  
  const tagName = element.tagName.toLowerCase();
  const type = element.type?.toLowerCase();
  
  // Standard input elements
  if (tagName === 'textarea') return true;
  if (tagName === 'input' && (!type || ['text', 'email', 'password', 'search', 'url', 'tel'].includes(type))) {
    return true;
  }
  
  // Contenteditable elements
  if (element.contentEditable === 'true') return true;
  
  // Check for common editor elements
  if (element.classList.contains('editor') || 
      element.classList.contains('input') ||
      element.getAttribute('role') === 'textbox') {
    return true;
  }
  
  return false;
}

// Visual indicators
function addVisualIndicators() {
  // Create indicator element
  const indicator = document.createElement('div');
  indicator.className = 'typewriter-indicator';
  indicator.id = 'typewriter-indicator';
  document.body.appendChild(indicator);
}

function showIndicator(message, type = 'ready') {
  const indicator = document.getElementById('typewriter-indicator');
  if (indicator) {
    indicator.textContent = message;
    indicator.className = `typewriter-indicator ${type} show`;
  }
}

function hideIndicator() {
  const indicator = document.getElementById('typewriter-indicator');
  if (indicator) {
    indicator.classList.remove('show');
  }
}

// Keyboard shortcuts
function addKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e) {
  // Get current hotkey settings
  chrome.storage.local.get(['typewriterSettings'], (result) => {
    if (!result.typewriterSettings) return;
    
    const settings = result.typewriterSettings;
    const modifier = settings.hotkeyModifier || 'Ctrl+Shift';
    const key = settings.hotkeyKey || 'T';
    
    // Check if the pressed key combination matches
    const isCorrectModifier = checkModifier(e, modifier);
    const isCorrectKey = e.key.toLowerCase() === key.toLowerCase();
    
    if (isCorrectModifier && isCorrectKey) {
      e.preventDefault();
      handleStartTyping();
    }
  });
}

function checkModifier(e, modifier) {
  switch (modifier) {
    case 'Ctrl+Shift':
      return (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey;
    case 'Alt+Shift':
      return e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey;
    default:
      return false;
  }
}

function handleStartTyping() {
  if (!focusedElement) {
    showIndicator('Please focus an input field first', 'ready');
    return;
  }
  
  if (typewriterInstance && typewriterInstance.isRunning) {
    showIndicator('Already typing', 'typing');
    return;
  }
  
  // Check if ready state exists
  chrome.storage.local.get(['readyText', 'readySettings', 'isReady'], (result) => {
    if (!result.isReady || !result.readyText) {
      showIndicator('Open extension and click "Ready to Type" first', 'ready');
      setTimeout(() => hideIndicator(), 3000);
      return;
    }
    
    startTypewriterWithText(result.readyText, result.readySettings);
    
    // Clear ready state after use
    chrome.storage.local.set({ isReady: false });
  });
}

// Enhanced Typewriter Implementation
class TypewriterInstance {
  constructor(element, text, settings) {
    this.element = element;
    this.text = text;
    this.settings = settings || this.getDefaultSettings();
    this.currentIndex = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.timeoutId = null;
    this.startTime = null;
    this.mistakes = [];
  }
  
  getDefaultSettings() {
    return {
      baseSpeed: 50,
      letterSpeed: 1,
      numberSpeed: 1.2,
      punctuationSpeed: 1.5,
      randomVariations: true,
      punctuationPauses: true,
      typingMistakes: false,
      typingPattern: 'smooth',
      typingMode: 'character'
    };
  }
  
  start() {
    this.isRunning = true;
    this.startTime = Date.now();
    this.clearElement();
    this.element.focus();
    
    // Add visual feedback
    this.element.classList.remove('typewriter-focused');
    this.element.classList.add('typewriter-typing');
    
    showIndicator('Typing...', 'typing');
    this.typeNext();
  }
  
  stop() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    // Remove visual feedback
    if (this.element) {
      this.element.classList.remove('typewriter-typing');
      this.element.classList.add('typewriter-focused');
    }
  }
  
  togglePause() {
    this.isPaused = !this.isPaused;
    if (!this.isPaused && this.isRunning) {
      this.typeNext();
    }
  }
  
  clearElement() {
    if (this.element.tagName.toLowerCase() === 'textarea' || 
        this.element.tagName.toLowerCase() === 'input') {
      this.element.value = '';
    } else if (this.element.contentEditable === 'true') {
      this.element.textContent = '';
    }
  }
  
  getCurrentValue() {
    if (this.element.tagName.toLowerCase() === 'textarea' || 
        this.element.tagName.toLowerCase() === 'input') {
      return this.element.value;
    } else if (this.element.contentEditable === 'true') {
      return this.element.textContent;
    }
    return '';
  }
  
  setCurrentValue(value) {
    if (this.element.tagName.toLowerCase() === 'textarea' || 
        this.element.tagName.toLowerCase() === 'input') {
      this.element.value = value;
    } else if (this.element.contentEditable === 'true') {
      this.element.textContent = value;
    }
    
    // Trigger input events
    this.element.dispatchEvent(new Event('input', { bubbles: true }));
    this.element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  typeNext() {
    if (!this.isRunning || this.isPaused || this.currentIndex >= this.text.length) {
      if (this.currentIndex >= this.text.length && this.isRunning) {
        this.complete();
      }
      return;
    }
    
    const char = this.text.charAt(this.currentIndex);
    const shouldMakeMistake = this.settings.typingMistakes && 
                             Math.random() < 0.02 && 
                             /[a-zA-Z]/.test(char);
    
    if (shouldMakeMistake) {
      this.typeMistake(char);
    } else {
      this.typeCharacter(char);
    }
  }
  
  typeCharacter(char) {
    if (this.settings.typingMode === 'word' && char === ' ') {
      this.typeWord();
    } else {
      const currentValue = this.getCurrentValue();
      this.setCurrentValue(currentValue + char);
      this.currentIndex++;
      this.scheduleNext();
    }
  }
  
  typeWord() {
    let word = '';
    let i = this.currentIndex;
    
    // Collect the word
    while (i < this.text.length && this.text.charAt(i) !== ' ') {
      word += this.text.charAt(i);
      i++;
    }
    
    // Add the word
    const currentValue = this.getCurrentValue();
    this.setCurrentValue(currentValue + word);
    this.currentIndex = i;
    this.scheduleNext();
  }
  
  typeMistake(correctChar) {
    // Type wrong character
    const wrongChar = this.getRandomWrongChar(correctChar);
    const currentValue = this.getCurrentValue();
    this.setCurrentValue(currentValue + wrongChar);
    
    // Schedule correction
    setTimeout(() => {
      if (!this.isRunning || this.isPaused) return;
      
      // Remove wrong character
      const valueWithMistake = this.getCurrentValue();
      this.setCurrentValue(valueWithMistake.slice(0, -1));
      
      // Type correct character
      setTimeout(() => {
        if (!this.isRunning || this.isPaused) return;
        
        const correctedValue = this.getCurrentValue();
        this.setCurrentValue(correctedValue + correctChar);
        this.currentIndex++;
        this.scheduleNext();
      }, this.getBackspaceDelay());
    }, this.getCharDelay(wrongChar));
  }
  
  getRandomWrongChar(correctChar) {
    const nearby = this.getNearbyKeys(correctChar);
    return nearby[Math.floor(Math.random() * nearby.length)] || 
           String.fromCharCode(97 + Math.floor(Math.random() * 26));
  }
  
  getNearbyKeys(char) {
    const keyboard = {
      'q': ['w', 'a'], 'w': ['q', 'e', 's'], 'e': ['w', 'r', 'd'],
      'r': ['e', 't', 'f'], 't': ['r', 'y', 'g'], 'y': ['t', 'u', 'h'],
      'u': ['y', 'i', 'j'], 'i': ['u', 'o', 'k'], 'o': ['i', 'p', 'l'],
      'p': ['o', 'l'], 'a': ['q', 's', 'z'], 's': ['a', 'w', 'd', 'x'],
      'd': ['s', 'e', 'f', 'c'], 'f': ['d', 'r', 'g', 'v'], 
      'g': ['f', 't', 'h', 'b'], 'h': ['g', 'y', 'j', 'n'],
      'j': ['h', 'u', 'k', 'm'], 'k': ['j', 'i', 'l'], 'l': ['k', 'o'],
      'z': ['a', 'x'], 'x': ['z', 's', 'c'], 'c': ['x', 'd', 'v'],
      'v': ['c', 'f', 'b'], 'b': ['v', 'g', 'n'], 'n': ['b', 'h', 'm'],
      'm': ['n', 'j']
    };
    
    return keyboard[char.toLowerCase()] || [char];
  }
  
  scheduleNext() {
    if (this.currentIndex >= this.text.length) {
      this.complete();
      return;
    }
    
    const nextChar = this.text.charAt(this.currentIndex);
    const delay = this.getCharDelay(nextChar);
    
    this.timeoutId = setTimeout(() => this.typeNext(), delay);
  }
  
  getCharDelay(char) {
    let baseDelay = this.settings.baseSpeed;
    
    // Apply character-specific modifiers
    if (/[a-zA-Z]/.test(char)) {
      baseDelay *= this.settings.letterSpeed;
    } else if (/[0-9]/.test(char)) {
      baseDelay *= this.settings.numberSpeed;
    } else if (/[.,!?;:()]/.test(char)) {
      baseDelay *= this.settings.punctuationSpeed;
      
      // Add pause after sentence-ending punctuation
      if (this.settings.punctuationPauses && /[.!?]/.test(char)) {
        baseDelay += Math.random() * 300 + 200;
      }
    }
    
    // Apply typing pattern
    switch (this.settings.typingPattern) {
      case 'hunt-peck':
        baseDelay += Math.random() * 150 + 50;
        if (Math.random() < 0.1) baseDelay += 200; // Occasional longer pauses
        break;
      case 'burst':
        baseDelay *= 0.4;
        if (Math.random() < 0.15) baseDelay *= 2; // Occasional normal speed
        break;
      case 'smooth':
      default:
        break;
    }
    
    // Add random variations
    if (this.settings.randomVariations) {
      const variation = (Math.random() - 0.5) * baseDelay * 0.4;
      baseDelay += variation;
    }
    
    return Math.max(10, Math.floor(baseDelay));
  }
  
  getBackspaceDelay() {
    return Math.floor(this.settings.baseSpeed * 0.3) + Math.random() * 50;
  }
  
  complete() {
    this.isRunning = false;
    
    // Remove visual feedback
    if (this.element) {
      this.element.classList.remove('typewriter-typing');
      this.element.classList.add('typewriter-focused');
    }
    
    const duration = Date.now() - this.startTime;
    const wpm = Math.round((this.text.length / 5) / (duration / 60000));
    
    showIndicator(`Completed! ${wpm} WPM`, 'ready');
    
    // Auto-hide indicator after completion
    setTimeout(() => hideIndicator(), 3000);
    
    // Notify popup
    chrome.runtime.sendMessage({ 
      action: 'typingComplete', 
      stats: { duration, wpm, characters: this.text.length }
    });
  }
}

// Message handling from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startTyping':
      startTypewriterWithText(message.text, message.settings);
      sendResponse({ success: true });
      break;
    case 'pauseTyping':
      if (typewriterInstance) {
        typewriterInstance.togglePause();
        sendResponse({ paused: typewriterInstance.isPaused });
      }
      break;
    case 'stopTyping':
      if (typewriterInstance) {
        typewriterInstance.stop();
        typewriterInstance = null;
      }
      sendResponse({ success: true });
      break;
    case 'getStatus':
      sendResponse({
        isTyping: typewriterInstance?.isRunning || false,
        isPaused: typewriterInstance?.isPaused || false,
        hasFocusedElement: !!focusedElement
      });
      break;
  }
});

function startTypewriterWithText(text, settings) {
  if (!focusedElement) {
    showIndicator('Please focus an input field first', 'ready');
    return;
  }
  
  // Stop existing instance
  if (typewriterInstance) {
    typewriterInstance.stop();
  }
  
  // Create and start new instance
  typewriterInstance = new TypewriterInstance(focusedElement, text, settings);
  typewriterInstance.start();
}

// Make TypewriterInstance available globally for injection
window.TypewriterInstance = TypewriterInstance;