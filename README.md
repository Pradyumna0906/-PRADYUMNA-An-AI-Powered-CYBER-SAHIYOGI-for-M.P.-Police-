<p align="center">
  <img src="https://img.shields.io/badge/PRADYUMNA-Cyber%20Sahiyogi-blue?style=for-the-badge&logo=shield&logoColor=white" alt="PRADYUMNA Badge"/>
  <img src="https://img.shields.io/badge/M.P.%20Police-Cyber%20Cell-orange?style=for-the-badge&logo=shield&logoColor=white" alt="MP Police Badge"/>
</p>

<h1 align="center">🛡️ PRADYUMNA — An AI-Powered CYBER SAHIYOGI</h1>
<h3 align="center">for Madhya Pradesh Police Cyber Cell</h3>

<p align="center">
  <em>AI-powered cybercrime investigation assistant built using RAG (Retrieval-Augmented Generation) to deliver simple, actionable, and context-aware guidance from the MHA Cyber Crime Investigation Manual — in Hinglish.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Groq-LLaMA%203.3-FF6F00?style=flat-square&logo=meta&logoColor=white"/>
  <img src="https://img.shields.io/badge/RAG-Vector%20Search-8B5CF6?style=flat-square"/>
  <img src="https://img.shields.io/badge/TTS-Edge%20TTS-00A4EF?style=flat-square&logo=microsoft&logoColor=white"/>
  <img src="https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat-square&logo=render&logoColor=white"/>
</p>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Dual Mode Operation](#-dual-mode-operation)
- [RAG Pipeline](#-rag-pipeline)
- [Screenshots](#-screenshots)
- [Developer](#-developer)
- [License](#-license)

---

## 🔍 About the Project

**PRADYUMNA** is an AI-powered **Cyber Sahiyogi (Cyber Companion)** designed specifically for the **Madhya Pradesh Police Cyber Cell**. It assists police personnel — especially field-level constables and investigators — in handling real-world cybercrime cases by providing:

- **Instant investigation guidance** from the MHA Cyber Crime Investigation Manual
- **Step-by-step SOPs** for various cyber offenses (phishing, UPI fraud, ransomware, etc.)
- **Relevant legal sections** (IT Act 2000, IPC/BNS) for FIR registration
- **Voice interaction** in Hinglish (Hindi + English) via Edge TTS
- **Real-time system monitoring** through a futuristic tactical HUD interface

> 🎯 **Mission**: Bridge the knowledge gap in cybercrime investigation at the grassroots police level by making expert-level guidance accessible through natural language AI.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🧠 **RAG-Powered Knowledge Base** | Local vector search over the MHA Cyber Crime Investigation Manual (~400+ pages) using `@xenova/transformers` embeddings |
| 🗣️ **Voice Interaction (TTS)** | Real-time Hindi voice responses using Edge TTS with concurrent sentence-level streaming |
| 🔄 **Dual Mode Operation** | Auto-detects cybercrime queries vs general commands — switches response format accordingly |
| 📡 **Real-Time System Telemetry** | Live CPU, RAM, battery, WiFi, and process monitoring via WebSocket heartbeats |
| 🗺️ **Tactical Map Integration** | Location-aware interface with Leaflet.js map overlay |
| 🎨 **Futuristic HUD Interface** | Iron Man-inspired tactical dashboard with draggable components |
| 🔒 **Identity Protection** | Hardcoded creator identity — cannot be overridden by prompt injection |
| ⚡ **Multi-Model Fallback** | Automatic fallback chain: LLaMA 3.3 70B → LLaMA 3.1 8B → Offline RAG |
| 🛠️ **Tool Integration** | AI can open websites, search the web, launch apps via function calling |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (React 19)               │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐    │
│  │ Terminal  │ │ HUD/Map  │ │ System Diagnostics│    │
│  │ (Voice)  │ │ (Leaflet)│ │ (CPU/RAM/Battery) │    │
│  └────┬─────┘ └────┬─────┘ └────────┬──────────┘    │
│       │             │                │               │
│       └─────────────┼────────────────┘               │
│                     │ Socket.IO                      │
└─────────────────────┼────────────────────────────────┘
                      │
┌─────────────────────┼────────────────────────────────┐
│              BACKEND (Node.js + Express)             │
│                     │                                │
│  ┌──────────────────▼───────────────────┐            │
│  │         Socket.IO Server              │           │
│  │  ┌─────────┐  ┌──────────────────┐   │           │
│  │  │ General │  │  Cyber Crime     │   │           │
│  │  │  Mode   │  │  Mode (RAG)     │   │           │
│  │  └────┬────┘  └───────┬──────────┘   │           │
│  │       │               │              │           │
│  │  ┌────▼────┐  ┌───────▼──────────┐   │           │
│  │  │  Groq   │  │ Vector Search +  │   │           │
│  │  │  LLaMA  │  │ Groq LLaMA      │   │           │
│  │  └────┬────┘  └───────┬──────────┘   │           │
│  │       │               │              │           │
│  │  ┌────▼────────────────▼─────────┐   │           │
│  │  │      Edge TTS (Hinglish)      │   │           │
│  │  └───────────────────────────────┘   │           │
│  └──────────────────────────────────────┘            │
│                                                      │
│  ┌──────────────────────────────────────┐            │
│  │  RAG Processor (rag_processor.js)    │           │
│  │  - @xenova/transformers embeddings   │           │
│  │  - Cosine similarity search          │           │
│  │  - MHA Manual vector store           │           │
│  └──────────────────────────────────────┘            │
└──────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js 18+** | Runtime environment |
| **Express.js** | HTTP server & API |
| **Socket.IO** | Real-time bidirectional communication |
| **Groq API** | LLM inference (LLaMA 3.3 70B / 3.1 8B) |
| **@xenova/transformers** | Local embedding model for RAG vector search |
| **Edge TTS** | Text-to-Speech in Hindi (hi-IN-MadhurNeural) |
| **pdf-parse** | PDF extraction for manual indexing |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework |
| **Socket.IO Client** | Real-time server communication |
| **Leaflet.js / React-Leaflet** | Interactive tactical map |
| **Three.js** | 3D animated blob visualization |
| **Lucide React** | Icon system |
| **React Draggable** | Draggable HUD components |

### Deployment
| Platform | Service |
|----------|---------|
| **Render** | Cloud hosting (Backend: Web Service, Frontend: Static Site) |

---

## 📁 Project Structure

```
PRADYUMNA/
├── backend/
│   ├── server.js              # Main backend server (Socket.IO + Groq + TTS)
│   ├── tools.js               # AI tool definitions (web search, app launch, etc.)
│   ├── rag_processor.js       # RAG vector search engine
│   ├── rag_store.json         # Pre-computed vector embeddings of MHA manual
│   ├── index_manual.js        # Script to index the PDF manual into vectors
│   ├── package.json           # Backend dependencies
│   └── .env                   # API keys (not tracked by git)
│
├── frountend/                 # React frontend application
│   ├── public/
│   │   └── index.html         # HTML entry point
│   ├── src/
│   │   ├── App.js             # Main application component
│   │   ├── App.css            # Global styles
│   │   ├── index.js           # React entry point
│   │   ├── index.css          # Root styles
│   │   └── component/
│   │       ├── blob.js        # 3D animated AI visualization (Three.js)
│   │       ├── Terminal.js     # Voice command terminal
│   │       ├── Nabbar.js      # Navigation bar
│   │       ├── Status.js      # System status overlay
│   │       ├── AdvancedHUD.js  # Tactical HUD with clock & map
│   │       ├── AwarenessHUD.js # Environmental awareness display
│   │       ├── FuturisticGauges.js  # CPU/RAM gauge visualizations
│   │       ├── SystemWidgets.js     # System info widgets
│   │       ├── UnifiedDiagnostics.js # Diagnostics panel
│   │       └── TacticalRotator.js   # Rotating tactical display
│   └── package.json           # Frontend dependencies
│
├── MHA-ASCL_Cyber_Crime_Investigation_Manual.pdf  # Source document for RAG
├── render.yaml                # Render deployment configuration
├── package.json               # Monorepo scripts
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Groq API Key** ([Get one free at console.groq.com](https://console.groq.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pradyumna0906/-PRADYUMNA-An-AI-Powered-CYBER-SAHIYOGI-for-M.P.-Police-.git
   cd -PRADYUMNA-An-AI-Powered-CYBER-SAHIYOGI-for-M.P.-Police-
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```
   Or manually:
   ```bash
   npm install
   cd backend && npm install
   cd ../frountend && npm install
   ```

3. **Configure environment variables**
   ```bash
   # Create backend/.env
   GROQ_API_KEY=your_groq_api_key_here
   PORT=5001
   ```

4. **Start the development servers**
   ```bash
   # Start both backend and frontend
   npm run dev
   
   # Or start separately:
   npm run backend    # Backend on port 5001
   npm run frontend   # Frontend on port 3000
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ Yes | API key from [Groq Console](https://console.groq.com) for LLaMA inference |
| `PORT` | ❌ Optional | Backend server port (default: `5001`) |

> ⚠️ **Never commit your `.env` file.** It is excluded via `.gitignore`.

---

## ☁️ Deployment

### Render (Recommended)

The project includes a `render.yaml` Blueprint for one-click deployment:

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New" → "Blueprint"**
4. Connect this repository
5. Set `GROQ_API_KEY` in the Render environment variables
6. Deploy!

**Services created:**
- `cyber-sahiyogi-backend` — Node.js Web Service (port 5001)
- `cyber-sahiyogi-frontend` — Static Site (React build)

---

## 🔀 Dual Mode Operation

### Mode 1: General Assistant 🤖
For everyday tasks like opening websites, searching, launching apps:
```
User: "YouTube kholo"
Pradyumna: "Ji Sir, YouTube khol diya hai! Aur kuch karna hai?"
```

### Mode 2: Cyber Crime Investigation 🛡️
Auto-activates when cybercrime keywords are detected:
```
User: "Phishing attack ka investigation kaise karein?"
Pradyumna: 
📋 CYBER CRIME REPORT
━━━━━━━━━━━━━━━━━━━━

1️⃣ SAMJHIYE (Explanation):
   Phishing ek aisi technique hai jismein criminal fake 
   website ya email bhejta hai...

2️⃣ UDAHARAN (Example):
   Jaise ki SBI ka fake email aata hai...

3️⃣ JAANCH KE STEPS (Investigation Steps):
   Step 1: URL ko check karein...
   Step 2: Email headers analyze karein...

4️⃣ SAVDHANIYAN (Precautions):
   ...
```

---

## 🧠 RAG Pipeline

The system uses a **fully local, offline-capable** RAG pipeline:

1. **Indexing** (`index_manual.js`): The MHA Cyber Crime Investigation Manual PDF is parsed and chunked
2. **Embedding** (`@xenova/transformers`): Each chunk is converted to a 384-dimensional vector using `all-MiniLM-L6-v2`
3. **Storage** (`rag_store.json`): Pre-computed embeddings are stored locally (~10MB)
4. **Search** (`rag_processor.js`): User queries are embedded and matched via cosine similarity
5. **Generation**: Top-5 matching chunks are injected into the LLM prompt as context

> 💡 **No external vector database required** — everything runs locally with zero API calls for the search phase.

---

## 📸 Screenshots

*Coming soon — tactical HUD interface screenshots*

---

## 👨‍💻 Developer

<table>
  <tr>
    <td align="center">
      <strong>Pradyumna Tripathi</strong><br/>
      B.Tech CSE, 3rd Year<br/>
      Oriental Institute of Science & Technology (OIST)<br/>
      Bhopal, Madhya Pradesh<br/><br/>
      <a href="https://github.com/Pradyumna0906">
        <img src="https://img.shields.io/badge/GitHub-Pradyumna0906-181717?style=flat-square&logo=github"/>
      </a>
    </td>
  </tr>
</table>

---

## 📄 License

This project is developed for the **Madhya Pradesh Police Cyber Cell** as part of an academic project at OIST, Bhopal.

---

<p align="center">
  <strong>🛡️ PRADYUMNA — Cyber Sahiyogi | Protecting Digital India 🇮🇳</strong>
</p>
