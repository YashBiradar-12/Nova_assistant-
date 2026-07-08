const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const voiceButton = document.getElementById('voiceButton');
const voiceStatus = document.getElementById('voiceStatus');
const voiceOverlay = document.getElementById('voiceOverlay');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;
let wakeWordDetected = false;
let commandInProgress = false;
let silenceTimer = null;
const endPhrases = ['end chat', 'thanks nova'];

function addMessage(text, role = 'assistant') {
  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTyping() {
  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.id = 'typingIndicator';
  typing.textContent = 'Nova is thinking...';
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateVoiceButtonState(state, statusText) {
  voiceButton.classList.remove('listening', 'thinking');
  if (state === 'listening') {
    voiceButton.classList.add('listening');
    voiceOverlay.classList.add('active');
  } else if (state === 'thinking') {
    voiceButton.classList.add('thinking');
    voiceOverlay.classList.add('active');
  } else {
    voiceOverlay.classList.remove('active');
  }
  voiceStatus.textContent = statusText;
}

function removeTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

function stopVoicePlayback() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

function speakReply(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1;
  stopVoicePlayback();
  speechSynthesis.speak(utterance);
}

function playAssistantAudio(audioUrl) {
  stopVoicePlayback();
  if (!audioUrl) return false;
  const audio = new Audio(audioUrl);
  audio.play().catch(() => {});
  return true;
}

function resetSilenceTimer() {
  if (silenceTimer) clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => {
    if (isListening) {
      updateVoiceButtonState('listening', 'Still listening. Say “Nova” to start a new request.');
    }
  }, 10000);
}

function stopVoiceMode() {
  if (recognition && isListening) {
    recognition.stop();
  }
  isListening = false;
  wakeWordDetected = false;
  commandInProgress = false;
  if (silenceTimer) clearTimeout(silenceTimer);
  voiceButton.classList.remove('listening', 'thinking');
  voiceOverlay.classList.remove('active');
  voiceButton.textContent = '🎤 Start Voice Mode';
  voiceStatus.textContent = 'Say “Nova” or “Nove” to activate listening.';
}

function playWakeWordSound() {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.18);
  gainNode.gain.setValueAtTime(0.06, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.22);
  setTimeout(() => context.close().catch(() => {}), 300);
}

function containsEndPhrase(text) {
  return endPhrases.some((phrase) => text.includes(phrase));
}

function sendPrompt(message) {
  addMessage(message, 'user');
  addTyping();
  updateVoiceButtonState('thinking', 'Nova is thinking...');

  fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })
    .then((response) => response.json())
    .then((data) => {
      removeTyping();
      const reply = data.reply || 'No reply received.';
      addMessage(reply, 'assistant');
      if (!playAssistantAudio(data.audio_url)) {
        speakReply(reply);
      }
      stopVoiceMode();
    })
    .catch(() => {
      removeTyping();
      addMessage('Something went wrong. Please try again.', 'assistant');
      stopVoiceMode();
    });
}

function startVoiceMode() {
  if (!SpeechRecognition) {
    addMessage('Voice input is not supported in this browser.', 'system');
    return;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isListening = true;
      wakeWordDetected = false;
      commandInProgress = false;
      voiceButton.textContent = '🔴 Listening for “Nova”';
      updateVoiceButtonState('listening', 'Waiting for the wake word...');
    };

    recognition.onerror = () => {
      updateVoiceButtonState('idle', 'Voice input error. Please try again.');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();

      if (!transcript) return;

      const normalizedTranscript = transcript.toLowerCase().replace(/[^a-z\s]/g, '');
      const isWakeWord = /\b(nova|nove|no va|no ve)\b/.test(normalizedTranscript);

      if (containsEndPhrase(normalizedTranscript)) {
        addMessage('Chat ended. Click the mic button to start again.', 'system');
        stopVoicePlayback();
        stopVoiceMode();
        return;
      }

      if (!wakeWordDetected) {
        if (isWakeWord) {
          wakeWordDetected = true;
          commandInProgress = true;
          playWakeWordSound();
          addMessage('Wake word detected. I’m listening for your command.', 'system');
          voiceButton.textContent = '🎙️ Listening for command';
          updateVoiceButtonState('listening', 'Speak your request clearly.');
          resetSilenceTimer();
        }
        return;
      }

      const commandText = normalizedTranscript
        .replace(/\b(nova|nove|no va|no ve)\b/g, '')
        .trim();

      if (commandText) {
        resetSilenceTimer();
        if (event.results[event.results.length - 1].isFinal) {
          sendPrompt(commandText);
          recognition.stop();
        }
      }
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };
  }

  try {
    recognition.start();
  } catch (error) {
    voiceStatus.textContent = 'Microphone already in use.';
  }
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  messageInput.value = '';
  addTyping();

  fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })
    .then((response) => response.json())
    .then((data) => {
      removeTyping();
      const reply = data.reply || 'No reply received.';
      addMessage(reply, 'assistant');
      if (!playAssistantAudio(data.audio_url)) {
        speakReply(reply);
      }
      stopVoiceMode();
    })
    .catch(() => {
      removeTyping();
      addMessage('Something went wrong. Please try again.', 'assistant');
      stopVoiceMode();
    });
});

voiceButton.addEventListener('click', () => {
  if (isListening) {
    stopVoiceMode();
  } else {
    startVoiceMode();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  addMessage('Hello! I’m Nova. Say “Nova” or “Nove” to activate voice mode.', 'system');
  updateVoiceButtonState('idle', 'Say “Nova” or “Nove” to activate listening.');
});
