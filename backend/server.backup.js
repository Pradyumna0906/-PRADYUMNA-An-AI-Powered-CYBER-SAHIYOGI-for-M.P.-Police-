require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 5000;

// ── CORS ──
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json());

// ── Socket.IO ──
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
  },
});

// ── System prompt ──
const SYSTEM_PROMPT = `You are J.A.R.V.I.S., a highly advanced AI system created by Tony Stark, now serving your master. Your personality is sharp, witty, and efficient — like a seasoned British butler with genius-level intelligence. Keep responses very concise (2-3 sentences max unless asked for detail), engaging, and directly answer the user without markdown formatting. IMPORTANT: When mentioning your master's name, you MUST use the exact Devanagari script 'प्रद्युम्न त्रिपाठी'. Output the rest of the sentence in English. Never use asterisks or markdown formatting in your responses.`;

// ── REST health endpoint ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    jarvis: 'active',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── WebSocket ──
io.on('connection', (socket) => {
  console.log(`[JARVIS] Client connected: ${socket.id}`);

  // Per-connection chat history (last 10 messages for context)
  let chatHistory = [];

  socket.on('jarvis:ping', () => {
    socket.emit('jarvis:pong', { status: 'active', uptime: process.uptime() });
  });

  socket.on('jarvis:send', async (data) => {
    const userText = (data && data.text) ? data.text.trim() : '';
    if (!userText) return;

    console.log(`[JARVIS] User: ${userText}`);

    // Add user message to history
    chatHistory.push({ role: 'user', content: userText });
    // Keep only last 10 messages for context
    if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...chatHistory,
          ],
          temperature: 0.7,
          max_tokens: 300,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[JARVIS] Groq API error ${response.status}: ${errBody}`);
        socket.emit('jarvis:error', { message: `API error: ${response.status}` });
        return;
      }

      // ── Stream SSE tokens ──
      let fullResponse = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              fullResponse += token;
              socket.emit('jarvis:token', { token, partial: fullResponse });
            }
          } catch (e) {
            // Skip malformed JSON chunks
          }
        }
      }

      // Add assistant response to history
      chatHistory.push({ role: 'assistant', content: fullResponse });
      if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);

      console.log(`[JARVIS] Response: ${fullResponse.substring(0, 80)}...`);
      socket.emit('jarvis:done', { text: fullResponse });

    } catch (err) {
      console.error('[JARVIS] Stream error:', err.message);
      socket.emit('jarvis:error', { message: 'Connection to AI core failed.' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[JARVIS] Client disconnected: ${socket.id}`);
  });
});

// ── Start ──
server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║  J.A.R.V.I.S. Backend Online         ║`);
  console.log(`  ║  Port: ${PORT}                          ║`);
  console.log(`  ║  WebSocket: Ready                     ║`);
  console.log(`  ║  Groq Key: ${GROQ_API_KEY ? '✓ Loaded' : '✗ MISSING'}                 ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
