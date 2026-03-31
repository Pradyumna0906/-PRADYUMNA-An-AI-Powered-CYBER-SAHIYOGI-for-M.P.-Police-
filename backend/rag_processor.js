const fs = require('fs-extra');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'rag_store.json');

// ── V9.0 VECTOR RAG ENGINE ──
// PDF → chunks → embeddings → cosine similarity → retrieval
// Fully local, zero API calls, instant search

let cachedStore = null;
let embeddingPipeline = null;

// Load the pre-built vector store (chunks + embeddings)
async function loadStore() {
    if (cachedStore) return cachedStore;
    if (!await fs.exists(STORE_PATH)) return null;
    try {
        cachedStore = await fs.readJson(STORE_PATH);
        console.log(`[RAG-V9] Loaded ${cachedStore.chunks?.length || 0} chunks with embeddings.`);
        return cachedStore;
    } catch (e) {
        console.error('[RAG-V9] Failed to load store:', e.message);
        return null;
    }
}

// Initialize the embedding model (lazy load on first query)
async function getEmbeddingPipeline() {
    if (embeddingPipeline) return embeddingPipeline;
    try {
        const { pipeline } = await import('@xenova/transformers');
        console.log('[RAG-V9] Loading embedding model (first-time only)...');
        embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true  // Smaller, faster
        });
        console.log('[RAG-V9] Embedding model ready.');
        return embeddingPipeline;
    } catch (e) {
        console.error('[RAG-V9] Embedding model failed:', e.message);
        return null;
    }
}

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

// Filter out junk chunks (TOC, blank, too short)
function isUsefulChunk(text) {
    if (!text || text.length < 50) return false;
    if (text.includes('TABLE OF CONTENTS')) return false;
    if (text.includes('table of contents')) return false;
    const dotCount = (text.match(/\.\.\./g) || []).length;
    if (dotCount > 5) return false;
    const cleaned = text.replace(/[\s\d\.\u0003]/g, '');
    if (cleaned.length < 30) return false;
    return true;
}

// Main search: embed query → cosine similarity → top-k results
async function searchManual(query, limit = 5) {
    const store = await loadStore();
    if (!store || !store.chunks) return [];

    const pipe = await getEmbeddingPipeline();
    
    if (pipe) {
        // ─── VECTOR SEARCH (Primary) ───
        try {
            const output = await pipe(query, { pooling: 'mean', normalize: true });
            const queryEmbedding = Array.from(output.data);

            const scored = store.chunks
                .map((c, idx) => {
                    const text = typeof c === 'string' ? c : (c.text || '');
                    const embedding = c.embedding || null;
                    if (!embedding || !isUsefulChunk(text)) return null;
                    const similarity = cosineSimilarity(queryEmbedding, embedding);
                    return { text, similarity, idx };
                })
                .filter(item => item !== null && item.similarity > 0.30)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);

            console.log(`[RAG-V9] Vector search: ${scored.length} results (top score: ${scored[0]?.similarity?.toFixed(3) || 'N/A'})`);
            return scored.map(s => s.text);
        } catch (e) {
            console.error('[RAG-V9] Vector search failed, falling back to keyword:', e.message);
        }
    }

    // ─── KEYWORD FALLBACK (if embedding model fails) ───
    const queryWords = query.toLowerCase()
        .replace(/[?.,!]/g, '')
        .split(/\s+/)
        .filter(w => w.length >= 2);

    if (queryWords.length === 0) return [];

    const scored = store.chunks
        .map(c => {
            const text = typeof c === 'string' ? c : (c.text || '');
            if (!isUsefulChunk(text)) return null;
            const lowerText = text.toLowerCase();
            let score = 0;
            for (const word of queryWords) {
                if (word.length < 3) continue;
                const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                const matches = lowerText.match(regex);
                if (matches) score += matches.length * (word.length > 5 ? 2 : 1);
            }
            return { text, score };
        })
        .filter(item => item !== null && item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    return scored.map(s => s.text);
}

// Pre-load store on module init (embeddings model loads lazily on first query)
loadStore().catch(() => {});

module.exports = { searchManual };
