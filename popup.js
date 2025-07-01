// State management
let currentSequence = [];
let isTyping = false;
let isPaused = false;
let isReady = false;
let currentTypingInstance = null;

// DOM elements
const navButtons = {
  home: document.getElementById("nav-home"),
  sequences: document.getElementById("nav-sequences"),
  settings: document.getElementById("nav-settings")
};

const views = {
  home: document.getElementById("view-home"),
  sequences: document.getElementById("view-sequences"),
  settings: document.getElementById("view-settings")
};

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
  initializeNavigation();
  initializeHomeView();
  initializeSequences();
  initializeSettings();
  loadSettings();
  updateUI();
  setupHotkeyListener();
});

// Navigation system
function initializeNavigation() {
  Object.entries(navButtons).forEach(([key, button]) => {
    button.addEventListener('click', () => switchView(key));
  });
}

function switchView(viewName) {
  // Update nav buttons
  Object.values(navButtons).forEach(btn => btn.classList.remove('active'));
  navButtons[viewName].classList.add('active');
  
  // Update views with smooth transition
  Object.values(views).forEach(view => view.classList.add('hidden'));
  views[viewName].classList.remove('hidden');
}

// Home view functionality
function initializeHomeView() {
  const textArea = document.getElementById('text');
  const clearBtn = document.getElementById('clear-text');
  const readyBtn = document.getElementById('ready');
  const pauseBtn = document.getElementById('pause');
  const stopBtn = document.getElementById('stop');
  
  // Text area events
  textArea.addEventListener('input', updateTextStats);
  clearBtn.addEventListener('click', clearText);
  
  // Control buttons
  readyBtn.addEventListener('click', setReady);
  pauseBtn.addEventListener('click', pauseTyping);
  stopBtn.addEventListener('click', stopTyping);
  
  // Initial updates
  updateTextStats();
}

function updateTextStats() {
  const text = document.getElementById('text').value;
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  
  document.getElementById('char-count').textContent = `${charCount} chars`;
  document.getElementById('word-count').textContent = `${wordCount} words`;
}

function clearText() {
  document.getElementById('text').value = '';
  updateTextStats();
}

// Ready functionality
function setReady() {
  const text = document.getElementById('text').value;
  if (!text.trim()) {
    alert('Please enter some text to type!');
    return;
  }
  
  // Store the text and settings
  const settings = getSettings();
  chrome.storage.local.set({ 
    readyText: text,
    readySettings: settings,
    isReady: true 
  });
  
  // Show ready state
  isReady = true;
  updateUI();
  updateStatus('ready', 'Ready to type');
  
  // Close popup after a short delay
  setTimeout(() => {
    window.close();
  }, 500);
}

// Sequences functionality
function initializeSequences() {
  document.getElementById('add-sequence-step').addEventListener('click', addSequenceStep);
  document.getElementById('run-sequence').addEventListener('click', runSequence);
  document.getElementById('clear-sequence').addEventListener('click', clearSequence);
}

function addSequenceStep() {
  const text = document.getElementById('text').value.trim();
  if (!text) {
    alert('Please enter some text first!');
    return;
  }
  
  currentSequence.push(text);
  updateSequenceDisplay();
  document.getElementById('text').value = '';
  updateTextStats();
}

function updateSequenceDisplay() {
  const sequenceList = document.getElementById('sequence-list');
  sequenceList.innerHTML = '';
  
  currentSequence.forEach((text, index) => {
    const item = document.createElement('div');
    item.className = 'sequence-item';
    item.innerHTML = `
      <div class="sequence-number">${index + 1}</div>
      <div class="sequence-text" title="${text}">${text}</div>
      <button class="sequence-remove" onclick="removeSequenceStep(${index})">✕</button>
    `;
    sequenceList.appendChild(item);
  });
  
  document.getElementById('run-sequence').disabled = currentSequence.length === 0;
}

function removeSequenceStep(index) {
  currentSequence.splice(index, 1);
  updateSequenceDisplay();
}

function clearSequence() {
  currentSequence = [];
  updateSequenceDisplay();
}

async function runSequence() {
  if (currentSequence.length === 0) return;
  
  for (let i = 0; i < currentSequence.length; i++) {
    updateStatus('active', `Step ${i + 1}/${currentSequence.length}`);
    await typeText(currentSequence[i]);
    
    // Wait between steps
    if (i < currentSequence.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  updateStatus('ready', 'Sequence completed');
}

// Settings functionality
function initializeSettings() {
  // Speed sliders
  const sliders = ['base-speed', 'letter-speed', 'number-speed', 'punctuation-speed'];
  sliders.forEach(sliderId => {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(`${sliderId}-value`);
    
    slider.addEventListener('input', () => {
      const value = slider.value;
      const unit = sliderId === 'base-speed' ? 'ms' : 'x';
      valueDisplay.textContent = `${value}${unit}`;
      saveSettings();
    });
  });
  
  // Checkboxes and selects
  const settings = ['random-variations', 'punctuation-pauses', 'typing-mistakes', 'typing-pattern', 'typing-mode'];
  settings.forEach(settingId => {
    const element = document.getElementById(settingId);
    element.addEventListener('change', saveSettings);
  });
  
  // Hotkey builder
  const hotkeyModifier = document.getElementById('hotkey-modifier');
  const hotkeyKey = document.getElementById('hotkey-key');
  const testHotkeyBtn = document.getElementById('test-hotkey');
  
  hotkeyModifier.addEventListener('change', updateHotkeyPreview);
  hotkeyKey.addEventListener('change', updateHotkeyPreview);
  testHotkeyBtn.addEventListener('click', testHotkey);
  
  updateHotkeyPreview();
}

function updateHotkeyPreview() {
  const modifier = document.getElementById('hotkey-modifier').value;
  const key = document.getElementById('hotkey-key').value;
  const hotkey = `${modifier}+${key}`;
  
  document.getElementById('hotkey-preview').textContent = hotkey;
  document.getElementById('ready-hotkey-display').textContent = hotkey;
  
  saveSettings();
}

function testHotkey() {
  const hotkey = document.getElementById('hotkey-preview').textContent;
  alert(`Test: Press ${hotkey} to start typing when ready!`);
}

function getSettings() {
  return {
    baseSpeed: parseInt(document.getElementById('base-speed').value),
    letterSpeed: parseFloat(document.getElementById('letter-speed').value),
    numberSpeed: parseFloat(document.getElementById('number-speed').value),
    punctuationSpeed: parseFloat(document.getElementById('punctuation-speed').value),
    randomVariations: document.getElementById('random-variations').checked,
    punctuationPauses: document.getElementById('punctuation-pauses').checked,
    typingMistakes: document.getElementById('typing-mistakes').checked,
    typingPattern: document.getElementById('typing-pattern').value,
    typingMode: document.getElementById('typing-mode').value,
    hotkeyModifier: document.getElementById('hotkey-modifier').value,
    hotkeyKey: document.getElementById('hotkey-key').value
  };
}

function saveSettings() {
  const settings = getSettings();
  chrome.storage.local.set({ typewriterSettings: settings });
}

function loadSettings() {
  chrome.storage.local.get(['typewriterSettings'], (result) => {
    if (result.typewriterSettings) {
      const settings = result.typewriterSettings;
      document.getElementById('base-speed').value = settings.baseSpeed || 50;
      document.getElementById('letter-speed').value = settings.letterSpeed || 1;
      document.getElementById('number-speed').value = settings.numberSpeed || 1.2;
      document.getElementById('punctuation-speed').value = settings.punctuationSpeed || 1.5;
      document.getElementById('random-variations').checked = settings.randomVariations !== false;
      document.getElementById('punctuation-pauses').checked = settings.punctuationPauses !== false;
      document.getElementById('typing-mistakes').checked = settings.typingMistakes || false;
      document.getElementById('typing-pattern').value = settings.typingPattern || 'smooth';
      document.getElementById('typing-mode').value = settings.typingMode || 'character';
      document.getElementById('hotkey-modifier').value = settings.hotkeyModifier || 'Ctrl+Shift';
      document.getElementById('hotkey-key').value = settings.hotkeyKey || 'T';
      
      // Update value displays
      document.getElementById('base-speed-value').textContent = `${settings.baseSpeed || 50}ms`;
      document.getElementById('letter-speed-value').textContent = `${settings.letterSpeed || 1}x`;
      document.getElementById('number-speed-value').textContent = `${settings.numberSpeed || 1.2}x`;
      document.getElementById('punctuation-speed-value').textContent = `${settings.punctuationSpeed || 1.5}x`;
      
      updateHotkeyPreview();
    }
  });
}

// Hotkey listener setup
function setupHotkeyListener() {
  // Check if already ready on popup open
  chrome.storage.local.get(['isReady'], (result) => {
    if (result.isReady) {
      isReady = true;
      updateUI();
      updateStatus('ready', 'Ready to type');
    }
  });
}

// Main typing functionality
async function startTypingFromHotkey() {
  // Get stored ready data
  chrome.storage.local.get(['readyText', 'readySettings', 'isReady'], async (result) => {
    if (!result.isReady || !result.readyText) {
      // Show notification that user needs to set up first
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: showNotReadyMessage
        });
      });
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: injectTypewriter,
      args: [result.readyText, result.readySettings || getDefaultSettings()]
    });
    
    isTyping = true;
    updateStatus('active', 'Typing...');
    
    // Clear ready state
    chrome.storage.local.set({ isReady: false });
    isReady = false;
  });
}

function showNotReadyMessage() {
  alert('Please open Typewriter Pro extension, enter your text, and click "Ready to Type" first!');
}

function getDefaultSettings() {
  return {
    baseSpeed: 50,
    letterSpeed: 1,
    numberSpeed: 1.2,
    punctuationSpeed: 1.5,
    randomVariations: true,
    punctuationPauses: true,
    typingMistakes: false,
    typingPattern: 'smooth',
    typingMode: 'character',
    hotkeyModifier: 'Ctrl+Shift',
    hotkeyKey: 'T'
  };
}

function pauseTyping() {
  isPaused = !isPaused;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: togglePause
    });
  });
  
  updateUI();
  updateStatus('active', isPaused ? 'Paused' : 'Typing...');
}

function stopTyping() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: stopTypewriter
    });
  });
  
  isTyping = false;
  isPaused = false;
  updateUI();
  updateStatus('ready', 'Stopped');
  hideProgress();
}

// UI updates
function updateUI() {
  const readyBtn = document.getElementById('ready');
  const readyInfo = document.getElementById('ready-info');
  
  if (isReady) {
    readyBtn.innerHTML = '<span class="btn-icon">✅</span>Ready Set!';
    readyBtn.disabled = false;
    readyInfo.style.display = 'block';
  } else {
    readyBtn.innerHTML = '<span class="btn-icon">🎯</span>Ready to Type';
    readyBtn.disabled = false;
    readyInfo.style.display = 'none';
  }
  
  document.getElementById('pause').disabled = !isTyping;
  document.getElementById('stop').disabled = !isTyping;
  
  if (isPaused) {
    document.getElementById('pause').innerHTML = '<span class="btn-icon">▶️</span>Resume';
  } else {
    document.getElementById('pause').innerHTML = '<span class="btn-icon">⏸️</span>Pause';
  }
}

function updateStatus(type, message) {
  const indicator = document.getElementById('status-indicator');
  const dot = indicator.querySelector('.status-dot');
  const text = indicator.querySelector('.status-text');
  
  dot.className = `status-dot ${type}`;
  text.textContent = message;
}

function startProgressTracking(totalChars) {
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  
  progressContainer.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = `0 / ${totalChars} characters`;
  
  // Simulate progress (in real implementation, this would come from content script)
  let current = 0;
  const interval = setInterval(() => {
    if (!isTyping || current >= totalChars) {
      clearInterval(interval);
      if (current >= totalChars) {
        setTimeout(() => {
          hideProgress();
          updateStatus('ready', 'Completed');
          isTyping = false;
          updateUI();
        }, 500);
      }
      return;
    }
    
    current++;
    const percentage = (current / totalChars) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${current} / ${totalChars} characters`;
  }, getSettings().baseSpeed);
}

function hideProgress() {
  document.getElementById('progress-container').style.display = 'none';
}

// Injected functions for content script
function injectTypewriter(text, settings) {
  // Stop any existing typewriter
  if (window.typewriterInstance) {
    window.typewriterInstance.stop();
  }
  
  const active = document.activeElement;
  if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && !active.contentEditable)) {
    alert("Please click into an input field, textarea, or contenteditable element first!");
    return;
  }
  
  window.typewriterInstance = new TypewriterInstance(active, text, settings);
  window.typewriterInstance.start();
}

function togglePause() {
  if (window.typewriterInstance) {
    window.typewriterInstance.togglePause();
  }
}

function stopTypewriter() {
  if (window.typewriterInstance) {
    window.typewriterInstance.stop();
    window.typewriterInstance = null;
  }
}

// Advanced Typewriter Implementation
function TypewriterInstance(element, text, settings) {
  this.element = element;
  this.text = text;
  this.settings = settings;
  this.currentIndex = 0;
  this.isRunning = false;
  this.isPaused = false;
  this.timeoutId = null;
  
  this.start = function() {
    this.isRunning = true;
    this.element.value = '';
    this.element.focus();
    this.typeNext();
  };
  
  this.stop = function() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  };
  
  this.togglePause = function() {
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.typeNext();
    }
  };
  
  this.typeNext = function() {
    if (!this.isRunning || this.isPaused || this.currentIndex >= this.text.length) {
      return;
    }
    
    const char = this.text.charAt(this.currentIndex);
    const shouldMakeMistake = this.settings.typingMistakes && Math.random() < 0.02;
    
    if (shouldMakeMistake) {
      // Type wrong character then correct it
      const wrongChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      this.element.value += wrongChar;
      
      setTimeout(() => {
        this.element.value = this.element.value.slice(0, -1);
        setTimeout(() => {
          this.element.value += char;
          this.currentIndex++;
          this.scheduleNext();
        }, this.getBackspaceDelay());
      }, this.getCharDelay(wrongChar));
    } else {
      // Type normally
      if (this.settings.typingMode === 'word' && char === ' ') {
        // Type whole word at once
        let word = '';
        let i = this.currentIndex;
        while (i < this.text.length && this.text.charAt(i) !== ' ') {
          word += this.text.charAt(i);
          i++;
        }
        this.element.value += word;
        this.currentIndex = i;
      } else {
        this.element.value += char;
        this.currentIndex++;
      }
      
      this.scheduleNext();
    }
  };
  
  this.scheduleNext = function() {
    if (this.currentIndex >= this.text.length) {
      this.isRunning = false;
      return;
    }
    
    const char = this.text.charAt(this.currentIndex);
    const delay = this.getCharDelay(char);
    
    this.timeoutId = setTimeout(() => this.typeNext(), delay);
  };
  
  this.getCharDelay = function(char) {
    let baseDelay = this.settings.baseSpeed;
    
    // Apply character-specific modifiers
    if (/[a-zA-Z]/.test(char)) {
      baseDelay *= this.settings.letterSpeed;
    } else if (/[0-9]/.test(char)) {
      baseDelay *= this.settings.numberSpeed;
    } else if (/[.,!?;:]/.test(char)) {
      baseDelay *= this.settings.punctuationSpeed;
      
      // Add pause after punctuation
      if (this.settings.punctuationPauses && /[.!?]/.test(char)) {
        baseDelay += 200;
      }
    }
    
    // Apply typing pattern
    switch (this.settings.typingPattern) {
      case 'hunt-peck':
        baseDelay += Math.random() * 100;
        break;
      case 'burst':
        baseDelay *= 0.3;
        break;
      case 'smooth':
      default:
        break;
    }
    
    // Add random variations
    if (this.settings.randomVariations) {
      baseDelay += (Math.random() - 0.5) * baseDelay * 0.3;
    }
    
    return Math.max(10, Math.floor(baseDelay));
  };
  
  this.getBackspaceDelay = function() {
    return this.settings.baseSpeed * 0.5;
  };
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'typingComplete':
      isTyping = false;
      updateUI();
      updateStatus('ready', 'Completed');
      hideProgress();
      break;
    case 'getLastText':
      chrome.storage.local.get(['readyText', 'readySettings'], (result) => {
        sendResponse({
          text: result.readyText,
          settings: result.readySettings
        });
      });
      return true; // Keep message channel open for async response
  }
});

// Listen for hotkey from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'hotkeyPressed') {
    startTypingFromHotkey();
  }
});

// Initialize with default values
updateStatus('ready', 'Ready');