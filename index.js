

```js
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

console.log("🚀 Starting SloTiers Discord Bot V3...");

client.once("clientReady", () => {
  console.log("=================================");
  console.log("🔥 SLOTIERS BOT V3 ONLINE");
  console.log(`🤖 Bot: ${client.user.tag}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log("=================================");
});

client.on("messageCreate", async (message) => {
  try {
    console.log("📩 MESSAGE RECEIVED");
    console.log(`Server: ${message.guild?.name ?? "DM"}`);
    console.log(`Channel: ${message.channel?.name ?? "unknown"}`);
    console.log(`Author: ${message.author?.tag ?? "unknown"}`);
    console.log(`Content: ${message.content || "(empty)"}`);
    console.log(`Embeds: ${message.embeds.length}`);

    if (!message.embeds.length) return;

    for (const embed of message.embeds) {
      console.log("🎯 EMBED FOUND");
      console.log(`Title: ${embed.title ?? "null"}`);
      console.log(`Description: ${embed.description ?? "null"}`);

      for (const field of embed.fields ?? []) {
        console.log(`${field.name}: ${field.value}`);
      }

      if (!embed.title?.includes("SloTiers Rezultat Testiranja")) {
        continue;
      }

      console.log("=================================");
      console.log("🎯 SLOTIERS RESULT DETECTED");
      console.log("=================================");

      let ign = "";
      let mode = "";
      let tier = "";
      let playerId = "";
      let testerId = "";
      let notes = "";

      for (const field of embed.fields ?? []) {
        const name = String(field.name || "").toLowerCase();
        const value = String(field.value || "").trim();

        if (name.includes("igralec") || name.includes("player")) {
          const mention = value.match(/<@!?(\d+)>/);

          if (mention) {
            playerId = mention[1];
          }

          const ignMatch = value.match(/\(`([^`]+)`\)/);

          if (ignMatch) {
            ign = ignMatch[1];
          }
        }

        if (
          name.includes("način boja") ||
          name.includes("način") ||
          name.includes("gamemode") ||
          name.includes("mode")
        ) {
          mode = value;
        }

        if (
          name.includes("dosežen tier") ||
          name.includes("tier") ||
          name.includes("achieved tier")
        ) {
          const tierMatch = value.match(
            /\b(?:HT1|LT1|HT2|LT2|HT3|LT3|HT4|LT4|HT5|LT5)\b/i
          );

          if (tierMatch) {
            tier = tierMatch[0].toUpperCase();
          }
        }

        if (name.includes("tester") || name.includes("tested by")) {
          const mention = value.match(/<@!?(\d+)>/);

          if (mention) {
            testerId = mention[1];
          }
        }

        if (
          name.includes("rezultat / opombe") ||
          name.includes("opombe") ||
          name.includes("notes")
        ) {
          notes = value;
        }
      }

      console.log("📋 PARSED RESULT");
      console.log("-------------------------");
      console.log(`👤 Player ID: ${playerId}`);
      console.log(`⛏️ IGN: ${ign}`);
      console.log(`🎮 Mode: ${mode}`);
      console.log(`🏆 Tier: ${tier}`);
      console.log(`🛡️ Tester ID: ${testerId}`);
      console.log(`📝 Notes: ${notes}`);
      console.log("-------------------------");

      if (!ign || !mode || !tier) {
        console.log("⚠️ Result is missing required data.");
        continue;
      }

      if (!process.env.DISCORD_INGEST_SECRET) {
        console.error("❌ DISCORD_INGEST_SECRET is missing!");
        return;
      }

      const payload = {
        embeds: [
          {
            title: embed.title,
            description: embed.description,
            fields: embed.fields
          }
        ]
      };

      console.log("📤 Sending result to SloTiers...");

      const response = await fetch(
        "https://slotiers.hatchable.site/api/discord/ranking",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-discord-ingest-secret": process.env.DISCORD_INGEST_SECRET
          },
          body: JSON.stringify(payload)
        }
      );

      const text = await response.text();

      console.log(`📡 SloTiers API status: ${response.status}`);
      console.log(`📡 SloTiers API response: ${text}`);

      if (response.ok) {
        console.log("✅ RESULT SUCCESSFULLY SENT TO SLOTIERS");
      } else {
        console.log("❌ SloTiers rejected the result.");
      }
    }
  } catch (error) {
    console.error("❌ MESSAGE HANDLER ERROR:");
    console.error(error);
  }
});

client.on("error", (error) => {
  console.error("❌ DISCORD CLIENT ERROR:");
  console.error(error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ UNHANDLED REJECTION:");
  console.error(error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION:");
  console.error(error);
});

if (!process.env.DISCORD_BOT_TOKEN) {
  console.error("❌ DISCORD_BOT_TOKEN is missing!");
  process.exit(1);
}

if (!process.env.DISCORD_INGEST_SECRET) {
  console.error("❌ DISCORD_INGEST_SECRET is missing!");
  process.exit(1);
}

client.login(process.env.DISCORD_BOT_TOKEN);
```
