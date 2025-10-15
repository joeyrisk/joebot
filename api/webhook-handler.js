// /api/webhook-handler.js
// Updated 2025-10-14
// Handles Notion webhooks and auto-rebuilds carrier index when Carriers DB updates.
// Supports data_source.*, page.*, database.*, comment.*, and file_upload.* events.

import { exec } from "child_process";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const event = req.body || {};
    const type = event?.type || event?.event?.type || "";
    const data = event?.data || event?.entity || event?.payload || {};
    const parentId =
      data?.parent?.data_source_id ||
      data?.parent?.database_id ||
      data?.parent?.id ||
      null;

    if (!type) {
      console.warn("Invalid or missing event type:", event);
      return res.status(400).json({ error: "Invalid event structure" });
    }

    console.log("Incoming Notion webhook event:", type);

    // Define the Carriers DB/Data Source IDs to watch
    const CARRIER_DB_IDS = [
      "24babcb1-dcc4-8064-a44c-fb5cd3f0fb33", // Replace with your actual Carriers database_id
      "carriers" // Safe fallback tag
    ];

    // Basic unified handler
    switch (type) {
      case "page.created":
      case "page.updated":
      case "page.deleted":
      case "page.properties_updated":
      case "data_source.content_updated":
      case "data_source.schema_updated":
      case "database.updated":
      case "database.content_updated":
        console.log("Detected data update:", {
          type,
          parentId: parentId || "unknown"
        });

        // Check if this update relates to the Carriers database
        if (
          parentId &&
          CARRIER_DB_IDS.some((id) =>
            parentId.toString().toLowerCase().includes(id.toLowerCase())
          )
        ) {
          console.log("Change detected in Carriers DB. Regenerating carrier index...");

          // Resolve absolute path to generator
          const generatorPath = path.resolve(
            process.cwd(),
            "scripts/generate-carrier-lookup.js"
          );

          // Run the script asynchronously
          exec(`node "${generatorPath}"`, (error, stdout, stderr) => {
            if (error) {
              console.error("Error running carrier index generator:", error.message);
            } else {
              console.log("Carrier index regenerated successfully.");
              console.log(stdout);
            }
            if (stderr) console.error("stderr:", stderr);
          });
        } else {
          console.log("Update ignored; not a Carriers DB change.");
        }
        break;

      case "comment.created":
      case "comment.updated":
      case "comment.deleted":
        console.log(`Comment event (${type}):`, data);
        break;

      case "file_upload.uploaded":
      case "file_upload.completed":
      case "file_upload.failed":
      case "file_upload.expired":
        console.log(`File upload event (${type}):`, data);
        break;

      case "database.created":
      case "database.deleted":
      case "data_source.created":
      case "data_source.deleted":
      case "data_source.moved":
      case "data_source.undeleted":
        console.log(`Schema or structure event (${type}):`, data);
        break;

      default:
        console.warn("Unhandled event type:", type);
        break;
    }

    // Always return 200 so Notion doesn't retry
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
