require("dotenv").config();

const { execSync } = require("child_process");
const app = require("./app");
const bot = require("./modules/bot/bot");
require("./modules/queue/worker");

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === "production") {
  try {
    console.log("[DB] Running prisma migrate deploy...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("[DB] Migrations complete");
  } catch (err) {
    console.error("[DB] Migration failed:", err.message);
    process.exit(1);
  }
}

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  bot.start().catch((err) => {
    console.error("Bot startup error:", err.message);
  });
});
