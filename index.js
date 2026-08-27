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

client.on("messageCreate", (message) => {
  console.log(
    `📩 MESSAGE | ${message.author.tag} | #${message.channel.name} | ${message.content}`
  );

  if (message.author.bot) return;

  if (message.embeds.length > 0) {
    console.log(`🎯 EMBED ZAZNAN: ${message.embeds.length}`);

    for (const embed of message.embeds) {
      console.log(
        JSON.stringify(embed.toJSON(), null, 2)
      );
    }
  }
});

client.on("error", (error) => {
  console.error("❌ DISCORD ERROR:", error);
});

client.login(process.env.DISCORD_BOT_TOKEN);
