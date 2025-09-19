// /lib/validateEnv.mjs

export const validateEnvVars = (requiredVars = []) => {
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required ENV variables:");
    missing.forEach((key) => console.error(`   - ${key}`));

    // 🚨 Crash the app to prevent unexpected behavior
    throw new Error(`Missing required ENV variables: ${missing.join(", ")}`);
  } else {
    console.log("✅ All required ENV variables are present.");
  }
};
