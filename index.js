const {
  Client,
  GatewayIntentBits
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  console.log(
    `📩 MESSAGE | ${message.author?.tag} | #${message.channel?.name}`
  );

  // Če ni embeda
  if (message.embeds.length === 0) {
    console.log("➡️ Brez embeda");
    return;
  }

  console.log(`🎯 ${message.embeds.length} EMBED(S) ZAZNANI`);

  for (const embed of message.embeds) {
    console.log("📦 EMBED:");
    console.log(JSON.stringify(embed.toJSON(), null, 2));

    // Prepoznaj SloTiers rezultat
    if (embed.title === "SloTiers Rezultat Testiranja") {
      console.log("🔥 SLOTIERS REZULTAT ZAZNAN!");

      for (const field of embed.fields ?? []) {
        console.log(`➡️ ${field.name}: ${field.value}`);
      }
    }
  }
});

client.on("error", (error) => {
  console.error("❌ DISCORD ERROR:", error);
});

client.login(process.env.DISCORD_BOT_TOKEN);
