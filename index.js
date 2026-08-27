const {
  Client,
  GatewayIntentBits
} = require("discord.js");

console.log("🚀 SLOTIERS BOT V2 - STARTING");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log("=================================");
  console.log("🔥 SLOTIERS BOT V2 ONLINE");
  console.log(`🤖 Bot: ${client.user.tag}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log("=================================");
});

client.on("messageCreate", (message) => {
  console.log("📩 V2 MESSAGE EVENT");

  console.log("User:", message.author?.tag);
  console.log("Channel:", message.channel?.name);
  console.log("Message:", message.content);
  console.log("Embeds:", message.embeds.length);

  if (message.embeds.length > 0) {
    console.log("🎯 V2 EMBED DETECTED");

    message.embeds.forEach((embed, index) => {
      console.log(`--- EMBED ${index + 1} ---`);
      console.log("Title:", embed.title);
      console.log("Description:", embed.description);

      if (embed.fields?.length) {
        embed.fields.forEach((field) => {
          console.log(`${field.name}: ${field.value}`);
        });
      }
    });
  }
});

client.on("error", (error) => {
  console.error("❌ V2 ERROR:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ V2 UNHANDLED:", error);
});

client.login(process.env.DISCORD_BOT_TOKEN);
