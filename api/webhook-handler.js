// /api/webhook-handler.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const event = req.body;

    // Basic shape check
    if (!event?.type || !event?.data) {
      console.warn("Received malformed event", event);
      return res.status(400).json({ error: "Invalid event structure" });
    }

    console.log("📨 Incoming Notion Webhook Event:", event.type);

    // 🔍 Switch on event type
    switch (event.type) {
      // -- PAGE EVENTS --
      case "page.created":
        console.log("✅ Page created:", event.data);
        break;

      case "page.updated":
        console.log("✏️ Page updated:", event.data);
        break;

      case "page.deleted":
        console.log("🗑️ Page deleted:", event.data);
        break;

      // -- DATABASE EVENTS --
      case "database.created":
        console.log("📂 Database created:", event.data);
        break;

      case "database.deleted":
        console.log("❌ Database deleted:", event.data);
        break;

      case "database.content_updated":
        console.log("📝 Database content updated:", event.data);
        break;

      // -- DATA SOURCE EVENTS --
      case "data_source.created":
        console.log("🧩 Data source created:", event.data);
        break;

      case "data_source.schema_updated":
        console.log("🛠️ Data source schema updated:", event.data);
        break;

      case "data_source.content_updated":
        console.log("📈 Data source content updated:", event.data);
        break;

      case "data_source.deleted":
        console.log("🗑️ Data source deleted:", event.data);
        break;

      // -- COMMENT EVENTS --
      case "comment.created":
      case "comment.updated":
      case "comment.deleted":
        console.log(`💬 Comment event (${event.type}):`, event.data);
        break;

      // -- FILE UPLOAD EVENTS --
      case "file_upload.uploaded":
        console.log("📁 File uploaded:", event.data);
        break;

      // -- UNKNOWN EVENTS --
      default:
        console.warn("🚨 Unhandled event type:", event.type);
        break;
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
