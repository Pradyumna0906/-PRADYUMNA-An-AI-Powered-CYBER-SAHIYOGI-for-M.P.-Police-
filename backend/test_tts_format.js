const { EdgeTTS } = require('edge-tts-universal');
const fs = require('fs');

async function test() {
    console.log('Testing EdgeTTS...');
    const tts = new EdgeTTS('Hello, this is a test.', 'en-IN-PrabhatNeural');
    try {
        const result = await tts.synthesize();
        console.log('Result keys:', Object.keys(result));
        if (result.audio) {
            console.log('result.audio keys:', Object.keys(result.audio));
            const ab = await result.audio.arrayBuffer();
            console.log('ArrayBuffer size:', ab.byteLength);
        } else if (result.arrayBuffer) {
            const ab = await result.arrayBuffer();
            console.log('ArrayBuffer size:', ab.byteLength);
        } else {
            console.log('No arrayBuffer method found');
        }
    } catch (err) {
        console.error('TTS Error:', err.message);
    }
}

test();
