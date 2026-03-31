const { processManual } = require('./rag_processor');

async function run() {
    try {
        await processManual();
        console.log('Manual indexed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Indexing failed:', err);
        process.exit(1);
    }
}

run();
