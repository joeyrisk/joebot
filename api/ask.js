// api/ask.js
import OpenAI from "openai";

// Let Vercel use Node runtime (not Edge)
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    // --- parse body safely ---
    const payload =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { message } = payload || {};
    if (!message) return res.status(400).json({ error: "Missing 'message' in body" });

    // --- check env vars early, return clear error if missing ---
    const apiKey = process.env.OPENAI_API_KEY;
    const assistantId = process.env.JOEBOT_ASSISTANT_ID;

    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set in Vercel env" });
    }
    if (!assistantId) {
      return res.status(500).json({ error: "JOEBOT_ASSISTANT_ID is not set in Vercel env" });
    }

    const openai = new OpenAI({ apiKey });

    // --- Create a thread ---
    const thread = await openai.beta.threads.create();

    // --- Add the user message ---
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    // --- Run the assistant ---
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // --- Poll until finished ---
    let runStatus = run;
    const started = Date.now();
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      // small sleep
      await new Promise((r) => setTimeout(r, 1200));
      // safety timeout (90s)
      if (Date.now() - started > 90_000) {
        throw new Error("Timeout waiting for assistant run to complete");
      }
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status !== "completed") {
      // include details for logs
      console.error("Run did not complete:", runStatus);
      return res.status(500).json({ error: `Run status: ${runStatus.status}` });
    }

    // --- Get the latest assistant message (desc + limit=1) ---
    const msgs = await openai.beta.threads.messages.list(thread.id, {
      order: "desc",
      limit: 1,
    });

    const answer =
      msgs.data?.[0]?.content?.[0]?.text?.value ??
      "(no answer)";

    return res.status(200).json({ answer });
  } catch (e) {
    console.error(e.stack || e); // show full stack in Vercel Runtime Logs
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
