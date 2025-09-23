// test-assistant.mjs
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config(); // Load your .env file

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testAssistant() {
  const assistantId = process.env.OPENAI_ASSISTANT_ID;
  const thread = await openai.beta.threads.create();

  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: 'What updates are available from Hanover?',
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId,
  });

  // Wait for assistant to complete
  let runStatus;
  do {
    const runInfo = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    runStatus = runInfo.status;
    console.log("Waiting... status:", runStatus);
    await new Promise(r => setTimeout(r, 2000));
  } while (runStatus !== 'completed');

  const messages = await openai.beta.threads.messages.list(thread.id);
  for (const msg of messages.data.reverse()) {
    console.log(`${msg.role.toUpperCase()}: ${msg.content[0].text.value}`);
  }
}

testAssistant().catch(console.error);
