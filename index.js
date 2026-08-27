js
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

console.log("Starting SloTiers Discord Bot V6");

client.once("ready", function () {
  console.log("=================================");
  console.log("SLOTIERS BOT V6 ONLINE");
  console.log("Bot: " + client.user.tag);
  console.log("Servers: " + client.guilds.cache.size);
  console.log("=================================");
});

client.on("messageCreate", async function (message) {
  try {
    console.log("MESSAGE RECEIVED");
    console.log("Server: " + (message.guild ? message.guild.name : "DM"));
    console.log("Channel: " + (message.channel ? message.channel.name : "unknown"));
    console.log("Author: " + message.author.tag);
    console.log("Content: " + (message.content || "(empty)"));
    console.log("Embeds: " + message.embeds.length);

    if (message.embeds.length === 0) {
      return;
    }

    for (const embed of message.embeds) {
      console.log("EMBED FOUND");
      console.log("Title: " + (embed.title || "null"));

      const fields = embed.fields || [];

      for (const field of fields) {
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

      for (const field of fields) {
        const name = String(field.name || "").toLowerCase();
        const value = String(field.value || "").trim();

        if (name.includes("igralec") || name.includes("player")) {
          const mentionStart = value.indexOf("<@");
          const mentionEnd = value.indexOf(">");

          if (mentionStart !== -1 && mentionEnd !== -1) {
            const mentionText = value.substring(
              mentionStart,
              mentionEnd + 1
            );

            playerId = mentionText
              .replace("<@", "")
              .replace("!", "")
              .replace(">", "");
          }

          const firstTick = value.indexOf(String.fromCharCode(96));
          const secondTick =
            firstTick !== -1
              ? value.indexOf(String.fromCharCode(96), firstTick + 1)
              : -1;

          if (firstTick !== -1 && secondTick !== -1) {
            ign = value.substring(firstTick + 1, secondTick);
          }
        }

        if (
          name.includes("način boja") ||
          name === "način" ||
          name.includes("gamemode") ||
          name === "mode"
        ) {
          mode = value;
        }

        if (
          name.includes("dosežen tier") ||
          name === "tier" ||
          name.includes("achieved tier")
        ) {
          const tierNames = [
            "HT1",
            "LT1",
            "HT2",
            "LT2",
            "HT3",
            "LT3",
            "HT4",
            "LT4",
            "HT5",
            "LT5"
          ];

          const upperValue = value.toUpperCase();

          for (const tierName of tierNames) {
            if (upperValue.includes(tierName)) {
              tier = tierName;
              break;
            }
          }
        }

        if (name.includes("tester") || name.includes("tested by")) {
          const mentionStart = value.indexOf("<@");
          const mentionEnd = value.indexOf(">");

          if (mentionStart !== -1 && mentionEnd !== -1) {
            const mentionText = value.substring(
              mentionStart,
              mentionEnd + 1
            );

            testerId = mentionText
              .replace("<@", "")
              .replace("!", "")
              .replace(">", "");
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

      console.log("-------------------------");
      console.log("PARSED RESULT");
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

      const payload = {
        player: playerId,
        ign: ign,
        mode: mode,
        tier: tier,
        tester: testerId,
        notes: notes
      };

      console.log("Payload:");
      console.log(JSON.stringify(payload));

      const response = await fetch(
        "https://slotiers.hatchable.site/api/discord/ranking",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-discord-ingest-secret":
              process.env.DISCORD_INGEST_SECRET
          },
          body: JSON.stringify(payload)
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
  console.error("DISCORD CLIENT ERROR");
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
