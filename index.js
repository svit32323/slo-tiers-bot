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
  console.log(`✅ Bot prijavljen kot ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  // Ignoriraj sporočila brez embedov
  if (!message.embeds.length) return;

  for (const embed of message.embeds) {
    // Preveri, ali je to naš SloTiers rezultat
    if (embed.title !== "SloTiers Rezultat Testiranja") continue;

    console.log("🎯 Zaznan SloTiers rezultat!");

    const fields = embed.fields || [];

    for (const field of fields) {
      console.log(`${field.name}: ${field.value}`);
    }

    console.log("📦 Celoten embed:");
    console.log(JSON.stringify(embed.toJSON(), null, 2));
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
