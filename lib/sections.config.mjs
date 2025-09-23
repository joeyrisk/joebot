// lib/sections.config.mjs
export const SECTIONS = [
  {
    section: "Commissions",
    databaseId: "24babcb1-dcc4-80e2-b39b-d73f39623ff6", // Commissions
    carrierRelationProp: "Carrier",                      // filter by this
    // Column order for markdown table:
    columns: [
      "Line of Business", "Market Type", "New Business", "Renewal",
      "Effective Date", "Conditions", "Notes", "Last Verified"
    ],
    sort: [{ property: "Line of Business", direction: "ascending" }]
  },
  {
    section: "Contacts",
    databaseId: "3ef0140c-b75d-4a82-a05a-cdb5a64a435a", // Contacts
    carrierRelationProp: "Carrier",
    columns: [
      "Contact Name", "Title/Role", "Contact Type",
      "Email", "Direct", "Office", "Cell Phone",
      "Segment", "Type", "Last Verified", "Notes"
    ],
    sort: [{ property: "Contact Name", direction: "ascending" }]
  },
  {
    section: "Endorsements",
    databaseId: "24cabcb1-dcc4-8029-b3e1-e0042afc7d71", // Endorsements
    carrierRelationProp: "Carrier",
    columns: [
      "Line of Business", "Process", "Request Method",
      "SLA (days)", "Required Docs", "Notes", "Last Verified"
    ],
    sort: [{ property: "Line of Business", direction: "ascending" }]
  }
];
