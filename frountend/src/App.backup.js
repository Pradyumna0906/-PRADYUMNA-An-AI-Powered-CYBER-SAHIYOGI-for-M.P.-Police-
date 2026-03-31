import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import Nabbar from './component/Nabbar';
import FractalAudioReactive from './component/blob';
import Terminal from './component/Terminal';
import Status from './component/Status';

const BACKEND_URL = 'http://localhost:5000';

function App() {
  const [blobConfig, setBlobConfig] = useState({
    colorPreset: 'Default',
    shape: 'Auto',
    scaleMult: 1.0,
    sensitivity: 1.0,
    dragEnabled: false,
  });

  const [chatHistory, setChatHistory] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  const recognitionRef = useRef(null);
  const socketRef = useRef(null);
  const isProcessingRef = useRef(false);
  const speechQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const spokenIndexRef = useRef(0);

  // refs for callbacks to use in socket handlers (avoid stale closures)
  const chunkAndSpeakRef = useRef(null);
  const finalizeSpeechRef = useRef(null);

  // ── Socket.IO Connection ──
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[JARVIS] Connected to backend');
      setBackendConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[JARVIS] Disconnected from backend');
      setBackendConnected(false);
    });

    socket.on('connect_error', () => {
      setBackendConnected(false);
    });

    // ── Streaming tokens ──
    socket.on('jarvis:token', (data) => {
      setStreamingText(data.partial || '');
      // Chunked TTS: speak completed sentences as they arrive
      if (chunkAndSpeakRef.current) chunkAndSpeakRef.current(data.partial || '');
    });

    socket.on('jarvis:done', (data) => {
      const finalText = data.text || '';
      setChatHistory(prev => [...prev, { role: 'assistant', content: finalText }]);
      setStreamingText('');
      setIsProcessing(false);
      isProcessingRef.current = false;

      // Speak any remaining unspoken text
      if (finalizeSpeechRef.current) finalizeSpeechRef.current(finalText);
    });

    socket.on('jarvis:error', (data) => {
      setChatHistory(prev => [...prev, { role: 'assistant', content: `SYSTEM ERROR: ${data.message}` }]);
      setStreamingText('');
      setIsProcessing(false);
      isProcessingRef.current = false;
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Chunked TTS ──
  const chunkAndSpeak = useCallback((partialText) => {
    // Find sentences that are complete (end with . ? ! or newline)
    const sentenceRegex = /[^.!?\n]+[.!?\n]+/g;
    const sentences = partialText.match(sentenceRegex) || [];

    // Only speak sentences we haven't spoken yet
    for (let i = spokenIndexRef.current; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.length > 2) {
        queueSpeech(sentence);
        spokenIndexRef.current = i + 1;
      }
    }
  }, []);

  const finalizeSpeech = useCallback((fullText) => {
    // Speak any trailing text that didn't end with punctuation
    const sentenceRegex = /[^.!?\n]+[.!?\n]+/g;
    const matched = fullText.match(sentenceRegex) || [];
    const matchedText = matched.join('');
    const remaining = fullText.slice(matchedText.length).trim();

    if (remaining.length > 2) {
      queueSpeech(remaining);
    }

    spokenIndexRef.current = 0;
  }, []);

  // Keep refs updated for socket handlers
  chunkAndSpeakRef.current = chunkAndSpeak;
  finalizeSpeechRef.current = finalizeSpeech;

  const queueSpeech = useCallback((text) => {
    speechQueueRef.current.push(text);
    if (!isSpeakingRef.current) {
      processNextSpeech();
    }
  }, []);

  const processNextSpeech = useCallback(() => {
    if (speechQueueRef.current.length === 0) {
      isSpeakingRef.current = false;
      // Resume listening after speech ends
      resumeListening();
      return;
    }

    isSpeakingRef.current = true;
    const text = speechQueueRef.current.shift();

    if (!window.speechSynthesis) {
      processNextSpeech();
      return;
    }

    // Phonetic substitutions for TTS
    let speakableText = text;
    speakableText = speakableText.replace(/प्रद्युम्न त्रिपाठी/g, 'Pradyumn Tripaathee');
    speakableText = speakableText.replace(/Pradyumn Tripathi/gi, 'Pradyumn Tripaathee');
    speakableText = speakableText.replace(/PRADYUMN TRIPATHI/gi, 'Pradyumn Tripaathee');
    speakableText = speakableText.replace(/J\.A\.R\.V\.I\.S\./g, 'Jarvis');
    speakableText = speakableText.replace(/J\.A\.R\.V\.I\.S/g, 'Jarvis');

    const utterance = new SpeechSynthesisUtterance(speakableText);

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes('UK English Male') || v.name.includes('Mark') || v.name.includes('David') || v.name.includes('Google UK English Male')
    ) || voices.find(v => v.lang === 'en-GB' || v.lang === 'en-US') || voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.pitch = 0.7;
    utterance.rate = 1.15; // Faster speech

    utterance.onend = () => {
      processNextSpeech();
    };

    utterance.onerror = () => {
      processNextSpeech();
    };

    // Pause recognition briefly while speaking
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  const resumeListening = useCallback(() => {
    if (recognitionRef.current && !isProcessingRef.current && !window.speechSynthesis.speaking) {
      try { recognitionRef.current.start(); } catch (e) {}
    }
  }, []);

  // ── Send message to backend ──
  const sendMessage = useCallback((text) => {
    if (!text.trim() || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsProcessing(true);

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    spokenIndexRef.current = 0;

    setChatHistory(prev => [...prev, { role: 'user', content: text }]);
    setStreamingText('');

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('jarvis:send', { text });
    } else {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'SYSTEM ERROR: Not connected to backend.' }]);
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, []);

  // ── Speech Recognition ──
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
    };

    let debounceTimer;

    recognition.onresult = (event) => {
      if (window.speechSynthesis.speaking) return;

      let localInterim = '';
      let isFinalResult = false;
      let finalStr = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          isFinalResult = true;
          finalStr += transcriptSegment;
        } else {
          localInterim += transcriptSegment;
        }
      }

      setInterimText(localInterim);

      if (isFinalResult && finalStr.trim().length > 0) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          sendMessage(finalStr);
          setInterimText('');
        }, 300);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      try {
        if (!isProcessingRef.current && !window.speechSynthesis.speaking) {
          recognitionRef.current.start();
        }
      } catch (err) {}
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
      setIsListening(false);
    };

    window.speechSynthesis.getVoices();

    try {
      recognition.start();
    } catch (e) {}

    return () => {
      recognition.stop();
      clearTimeout(debounceTimer);
    };
  }, [sendMessage]);

  // ── Auto-restart recognition ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.speechSynthesis.speaking) return;
      if (!isListening && !isProcessingRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isListening]);

  return (
    <div className="app-container">
      <Nabbar blobConfig={blobConfig} setBlobConfig={setBlobConfig} />
      <Status
        isListening={isListening}
        backendConnected={backendConnected}
        isProcessing={isProcessing}
      />
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
        <FractalAudioReactive config={blobConfig} />
      </div>
      <Terminal
        chatHistory={chatHistory}
        interimText={interimText}
        isListening={isListening}
        streamingText={streamingText}
        isProcessing={isProcessing}
        onSendMessage={sendMessage}
      />
    </div>
  );
}

export default App;
