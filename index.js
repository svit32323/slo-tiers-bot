const {
  Client,
  GatewayIntentBits
} = require("discord.js");

console.log("🚀 SLOTIERS BOT V3 - STARTING");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("clientReady", () => {
  console.log("=================================");
  console.log("🔥 SLOTIERS BOT V3 ONLINE");
  console.log(`🤖 Bot: ${client.user.tag}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log("=================================");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.embeds.length) return;

  for (const embed of message.embeds) {
    if (!embed.title?.includes("SloTiers Rezultat Testiranja")) {
      continue;
    }

    console.log("🎯 SLOTIERS REZULTAT DETECTED");

    let player = null;
    let ign = null;
    let mode = null;
    let tier = null;
    let tester = null;
    let notes = null;

    for (const field of embed.fields ?? []) {
      const name = field.name.replace(/:/g, "").trim();
      const value = field.value.trim();

      if (name.includes("Igralec")) {
        const match = value.match(/<@!?(\d+)>/);
        player = match ? match[1] : null;

        const ignMatch = value.match(/\(`([^`]+)`\)/);
        ign = ignMatch ? ignMatch[1] : null;
      }

      if (name.includes("Način boja")) {
        mode = value;
      }

      if (name.includes("Dosežen Tier")) {
        tier = value.replace(/\*/g, "").trim();
      }

      if (name.includes("Tester")) {
        const match = value.match(/<@!?(\d+)>/);
        tester = match ? match[1] : null;
      }

      if (name.includes("Rezultat / Opombe")) {
        notes = value;
      }
    }

    console.log("📋 Parsed result:");
    console.log({
      player,
      ign,
      mode,
      tier,
      tester,
      notes
    });

    // Zaenkrat samo preverjamo parser.
    // API povezavo dodava, ko potrdimo, da so podatki pravilni.
  }
});

client.on("error", (error) => {
  console.error("❌ DISCORD ERROR:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ UNHANDLED ERROR:", error);
});

client.login(process.env.DISCORD_BOT_TOKEN);
