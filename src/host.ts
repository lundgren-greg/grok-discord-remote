/**
 * src/host.ts — entry point: wire config → bot → start
 */
import "dotenv/config";
import { loadConfig } from "./config.js";
import { DiscordBot } from "./discord-bot.js";

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.discordBotToken) {
    console.error(
      "[host] DISCORD_BOT_TOKEN is not set. Copy .env.example to .env and fill it in."
    );
    process.exit(1);
  }

  if (config.allowFrom.length === 0) {
    console.warn(
      "[host] DISCORD_ALLOW_FROM is empty — no one will be able to use the bot!"
    );
  }

  const bot = new DiscordBot(config);

  process.on("SIGINT", () => {
    console.log("[host] shutting down…");
    bot.stop().then(() => process.exit(0)).catch(() => process.exit(1));
  });

  process.on("SIGTERM", () => {
    bot.stop().then(() => process.exit(0)).catch(() => process.exit(1));
  });

  await bot.start();
}

main().catch((err: unknown) => {
  console.error("[host] fatal:", err);
  process.exit(1);
});
