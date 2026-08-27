
```js
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

console.log("Starting SloTiers Discord Bot V4");

client.once("ready", function () {
  console.log("SLOTIERS BOT V4 ONLINE");
  console.log("Bot: " + client.user.tag);
  console.log("Servers: " + client.guilds.cache.size);
});

client.on("messageCreate", async function (message) {
  try {
    console.log("MESSAGE RECEIVED");
    console.log("Server: " + (message.guild ? message.guild.name : "DM"));
    console.log("Channel: " + (message.channel ? message.channel.name : "unknown"));
    console.log("Author: " + message.author.tag);
    console.log("Content: " + (message.content || "(empty)"));
    console.log("Embeds: " + message.embeds.length);

    if (!message.embeds.length) {
      return;
    }

    for (const embed of message.embeds) {
      console.log("EMBED FOUND");
      console.log("Title: " + (embed.title || "null"));

      for (const field of embed.fields || []) {
        console.log(field.name + ": " + field.value);
      }

      if (
        !embed.title ||
        !embed.title.includes("SloTiers Rezultat Testiranja")
      ) {
        continue;
      }

      console.log("SLOTIERS RESULT DETECTED");

      let ign = "";
      let mode = "";
      let tier = "";
      let playerId = "";
      let testerId = "";
      let notes = "";

      for (const field of embed.fields || []) {
        const name = String(field.name || "").toLowerCase();
        const value = String(field.value || "").trim();

        if (name.includes("igralec") || name.includes("player")) {
          const mention = value.match(/<@!?([0-9]+)>/);

          if (mention) {
            playerId = mention[1];
          }

          const open = value.indexOf("(");
          const close = value.lastIndexOf(")");

          if (open !== -1 && close > open) {
            const inside = value.substring(open + 1, close).trim();

            if (inside.startsWith("`") && inside.endsWith("`")) {
              ign = inside.substring(1, inside.length - 1);
            } else {
              ign = inside;
            }
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
            /\\b(?:HT1|LT1|HT2|LT2|HT3|LT3|HT4|LT4|HT5|LT5)\\b/i
          );

          if (tierMatch) {
            tier = tierMatch[0].toUpperCase();
          }
        }

        if (name.includes("tester") || name.includes("tested by")) {
          const mention = value.match(/<@!?([0-9]+)>/);

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

      console.log("PARSED RESULT");
      console.log("-------------------------");
      console.log("Player ID: " + playerId);
      console.log("IGN: " + ign);
      console.log("Mode: " + mode);
      console.log("Tier: " + tier);
      console.log("Tester ID: " + testerId);
      console.log("Notes: " + notes);
      console.log("-------------------------");

      if (!ign || !mode || !tier) {
        console.log("Result is missing required data");
        continue;
      }

      if (!process.env.DISCORD_INGEST_SECRET) {
        console.log("DISCORD_INGEST_SECRET is missing");
        continue;
      }

      console.log("Sending result to SloTiers");

      const response = await fetch(
        "https://slotiers.hatchable.site/api/discord/ranking",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-discord-ingest-secret": process.env.DISCORD_INGEST_SECRET
          },
          body: JSON.stringify({
            embeds: [
              {
                title: embed.title,
                description: embed.description,
                fields: embed.fields
              }
            ]
          })
        }
      );

      const result = await response.text();

      console.log("SloTiers status: " + response.status);
      console.log("SloTiers response: " + result);

      if (response.ok) {
        console.log("RESULT SENT SUCCESSFULLY");
      } else {
        console.log("SloTiers rejected the result");
      }
    }
  } catch (error) {
    console.error("MESSAGE HANDLER ERROR");
    console.error(error);
  }
});

client.on("error", function (error) {
  console.error("DISCORD ERROR");
  console.error(error);
});

process.on("unhandledRejection", function (error) {
  console.error("UNHANDLED REJECTION");
  console.error(error);
});

process.on("uncaughtException", function (error) {
  console.error("UNCAUGHT EXCEPTION");
  console.error(error);
});

if (!process.env.DISCORD_BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN is missing");
  process.exit(1);
}

if (!process.env.DISCORD_INGEST_SECRET) {
  console.error("DISCORD_INGEST_SECRET is missing");
  process.exit(1);
}

client.login(process.env.DISCORD_BOT_TOKEN);
```
