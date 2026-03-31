require('dotenv').config();

async function listModels() {
  const response = await fetch('https://api.groq.com/openai/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    }
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

listModels();
