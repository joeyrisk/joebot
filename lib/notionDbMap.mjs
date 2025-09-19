// /lib/notionDbMap.mjs

export const notionDbMap = {
  agency_codes: {
    databaseId: process.env.NOTION_DB_AGENCY_CODES,
    dataSourceId: "266abcb1-dcc4-81b9-a4ff-000b00019f7b",
    filterField: "Carrier"
  },
  aor_procedures: {
    databaseId: process.env.NOTION_DB_AOR_PROCEDURES,
    dataSourceId: "24cabcb1-dcc4-80c0-a252-000b5d1f7afe"
  },
  appetite_rules: {
    databaseId: process.env.NOTION_DB_APPETITE_RULES,
    dataSourceId: "24babcb1-dcc4-80f6-904d-000bf9373c6b"
  },
  billing_structure: {
    databaseId: process.env.NOTION_DB_BILLING_STRUCTURE,
    dataSourceId: "24cabcb1-dcc4-8070-93d3-000b9218fff0"
  },
  change_log: {
    databaseId: process.env.NOTION_DB_CHANGE_LOG,
    dataSourceId: "24babcb1-dcc4-80e8-848c-000b387f48d7"
  },
  claims: {
    databaseId: process.env.NOTION_DB_CLAIMS,
    dataSourceId: "24babcb1-dcc4-807e-81c9-000bd46c4bcd",
    filterField: "Carrier"
  },
  commissions: {
    databaseId: process.env.NOTION_DB_COMMISSIONS,
    dataSourceId: "24babcb1-dcc4-80c7-9471-000ba3655360"
  },
  contacts: {
    databaseId: process.env.NOTION_DB_CONTACTS,
    dataSourceId: "a17b8f09-fe48-435e-8413-01bc16840aeb",
    filterField: "Carrier"
  },
  employee_onboarding: {
    databaseId: process.env.NOTION_DB_EMPLOYEE_ONBOARDING,
    dataSourceId: "24cabcb1-dcc4-8035-8e7b-000ba5cc2a74"
  },
  endorsements: {
    databaseId: process.env.NOTION_DB_ENDORSEMENTS,
    dataSourceId: "24cabcb1-dcc4-8077-8646-000b9da4eeb9"
  },
  forms_docs: {
    databaseId: process.env.NOTION_DB_FORMS_DOCS,
    dataSourceId: "24babcb1-dcc4-8013-8f63-000b7951dec9"
  },
  industries: {
    databaseId: process.env.NOTION_DB_INDUSTRIES,
    dataSourceId: "24babcb1-dcc4-80ae-91d4-000bc266059a"
  },
  ivans: {
    databaseId: process.env.NOTION_DB_IVANS,
    dataSourceId: "24cabcb1-dcc4-809a-bcc2-000b46299c81"
  },
  line_of_business: {
    databaseId: process.env.NOTION_DB_LINE_OF_BUSINESS,
    dataSourceId: "24babcb1-dcc4-80ba-89dc-000b05e4f9c9"
  },
  loss_run_requests: {
    databaseId: process.env.NOTION_DB_LOSS_RUN_REQUESTS,
    dataSourceId: "24cabcb1-dcc4-802c-a139-000b651a5f4e",
    filterField: "Carrier"
  },
  mailing_addresses: {
    databaseId: process.env.NOTION_DB_MAILING_ADDRESSES,
    dataSourceId: "24cabcb1-dcc4-80bc-8276-000bed7a6205"
  },
  new_business: {
    databaseId: process.env.NOTION_DB_NEW_BUSINESS,
    dataSourceId: "24cabcb1-dcc4-800c-89d9-000b5e7b1a94",
    filterField: "Carrier"
  },
  policy_number_formats: {
    databaseId: process.env.NOTION_DB_POLICY_NUMBER_FORMATS,
    dataSourceId: "1f3abcb1-dcc4-8002-80dd-000b8a9fa4fb"
  },
  tips_and_tricks: {
    databaseId: process.env.NOTION_DB_TIPS_AND_TRICKS,
    dataSourceId: "24cabcb1-dcc4-8093-9646-000b377d70b3"
  }
};
