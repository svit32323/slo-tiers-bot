const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const INGEST_SECRET = process.env.DISCORD_INGEST_SECRET;

const RESULTS_CHANNEL = "⭐┃rezultati";

if (!BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN is missing");
  process.exit(1);
}

if (!INGEST_SECRET) {
  console.error("DISCORD_INGEST_SECRET is missing");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

console.log("Starting SloTiers Discord Bot");

function getMentionId(value) {
  const match = String(value || "").match(/<@!?(\d+)>/);

  if (match) {
    return match[1];
  }

  return "";
}

function getCodeValue(value) {
  const text = String(value || "");
  const first = text.indexOf("`");

  if (first === -1) {
    return "";
  }

  const second = text.indexOf("`", first + 1);

  if (second === -1) {
    return "";
  }

  return text.substring(first + 1, second).trim();
}

function parseEmbed(embed) {
  if (!embed) {
    return null;
  }

  const title = String(embed.title || "");

  if (!title.includes("SloTiers Rezultat Testiranja")) {
    return null;
  }

  let player = "";
  let ign = "";
  let mode = "";
  let tier = "";
  let tester = "";
  let notes = "";

  const fields = embed.fields || [];

  for (const field of fields) {
    const name = String(field.name || "").toLowerCase();
    const value = String(field.value || "").trim();

    if (
      name.includes("igralec") ||
      name.includes("player")
    ) {
      player = getMentionId(value);

      const code = getCodeValue(value);

      if (code) {
        ign = code;
      }
    }

    if (
      name.includes("način boja") ||
      name.includes("nacin boja") ||
      name === "način" ||
      name === "nacin" ||
      name.includes("gamemode") ||
      name === "mode"
    ) {
      mode = value;
    }

    if (
      name.includes("dosežen tier") ||
      name.includes("dosezen tier") ||
      name === "tier" ||
      name.includes("achieved tier")
    ) {
      const upper = value.toUpperCase();

      const tiers = [
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

      for (const tierName of tiers) {
        if (upper.includes(tierName)) {
          tier = tierName;
          break;
        }
      }
    }

    if (
      name.includes("tester") ||
      name.includes("tested by")
    ) {
      tester = getMentionId(value);
    }

    if (
      name.includes("rezultat / opombe") ||
      name.includes("rezultat/opombe") ||
      name.includes("opombe") ||
      name.includes("notes")
    ) {
      notes = value;
    }
  }

  if (!ign || !mode || !tier) {
    return null;
  }

  return {
    player: player,
    ign: ign,
    mode: mode,
    tier: tier,
    tester: tester,
    notes: notes
  };
}

async function sendToSloTiers(data) {
  const response = await fetch(
    "https://slotiers.hatchable.site/api/discord/ranking",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-discord-ingest-secret": INGEST_SECRET
      },
      body: JSON.stringify(data)
    }
  );

  const text = await response.text();

  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    body: body
  };
}

async function processMessage(message, source) {
  if (!message.embeds || message.embeds.length === 0) {
    return false;
  }

  for (const embed of message.embeds) {
    const data = parseEmbed(embed);

    if (!data) {
      continue;
    }

    console.log("==============================");
    console.log("SLOTIERS RESULT DETECTED");
    console.log("Source: " + source);
    console.log("Message ID: " + message.id);
    console.log("Player: " + data.player);
    console.log("IGN: " + data.ign);
    console.log("Mode: " + data.mode);
    console.log("Tier: " + data.tier);
    console.log("Tester: " + data.tester);
    console.log("Notes: " + data.notes);
    console.log("==============================");

    console.log(
      "Payload: " + JSON.stringify(data)
    );

    const result = await sendToSloTiers(data);

    console.log(
      "SloTiers status: " + result.status
    );

    console.log(
      "SloTiers response: " +
      JSON.stringify(result.body)
    );

    if (result.ok) {
      console.log("RESULT SENT SUCCESSFULLY");
      return true;
    }

    console.log("SloTiers rejected the result");
    return false;
  }

  return false;
}

client.once("clientReady", async function () {
  console.log("=================================");
  console.log("SLOTIERS BOT ONLINE");
  console.log("Bot: " + client.user.tag);
  console.log("Servers: " + client.guilds.cache.size);
  console.log("=================================");

  try {
    const command = new SlashCommandBuilder()
      .setName("import-history")
      .setDescription(
        "Import old SloTiers results from the results channel"
      )
      .setDefaultMemberPermissions(
        PermissionFlagsBits.Administrator
      );

    const rest = new REST({
      version: "10"
    }).setToken(BOT_TOKEN);

    for (const guild of client.guilds.cache.values()) {
      await rest.put(
        Routes.applicationGuildCommands(
          client.user.id,
          guild.id
        ),
        {
          body: [command.toJSON()]
        }
      );

      console.log(
        "Registered /import-history in " +
        guild.name
      );
    }
  } catch (error) {
    console.error("COMMAND REGISTRATION ERROR");
    console.error(error);
  }
});

client.on("messageCreate", async function (message) {
  try {
    console.log("MESSAGE RECEIVED");

    console.log(
      "Server: " +
      (message.guild
        ? message.guild.name
        : "DM")
    );

    console.log(
      "Channel: " +
      (message.channel
        ? message.channel.name
        : "unknown")
    );

    console.log(
      "Author: " +
      message.author.tag
    );

    console.log(
      "Embeds: " +
      message.embeds.length
    );

    await processMessage(
      message,
      "automatic"
    );
  } catch (error) {
    console.error("MESSAGE HANDLER ERROR");
    console.error(error);
  }
});

client.on("interactionCreate", async function (interaction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName !== "import-history") {
    return;
  }

  if (
    !interaction.memberPermissions ||
    !interaction.memberPermissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    await interaction.reply({
      content: "Nimaš dovoljenja za ta command.",
      ephemeral: true
    });

    return;
  }

  await interaction.deferReply({
    ephemeral: true
  });

  console.log("==============================");
  console.log("STARTING HISTORY IMPORT");
  console.log("==============================");

  const channel = interaction.guild.channels.cache.find(
    function (item) {
      return item.name === RESULTS_CHANNEL;
    }
  );

  if (!channel) {
    await interaction.editReply(
      "❌ Ne najdem channel-a " +
      RESULTS_CHANNEL
    );

    return;
  }

  if (!channel.isTextBased()) {
    await interaction.editReply(
      "❌ Ta channel ni text channel."
    );

    return;
  }

  let before = undefined;
  let checked = 0;
  let found = 0;
  let successful = 0;
  let failed = 0;

  try {
    while (true) {
      const options = {
        limit: 100
      };

      if (before) {
        options.before = before;
      }

      const messages =
        await channel.messages.fetch(options);

      if (messages.size === 0) {
        break;
      }

      console.log(
        "Fetched " +
        messages.size +
        " messages"
      );

      for (const message of messages.values()) {
        checked++;

        const isResult =
          message.embeds &&
          message.embeds.some(
            function (embed) {
              return (
                embed.title &&
                embed.title.includes(
                  "SloTiers Rezultat Testiranja"
                )
              );
            }
          );

        if (!isResult) {
          continue;
        }

        found++;

        const success =
          await processMessage(
            message,
            "history import"
          );

        if (success) {
          successful++;
        } else {
          failed++;
        }

        await new Promise(
          function (resolve) {
            setTimeout(resolve, 300);
          }
        );
      }

      before = messages.last().id;

      if (messages.size < 100) {
        break;
      }

      await new Promise(
        function (resolve) {
          setTimeout(resolve, 500);
        }
      );
    }

    console.log("==============================");
    console.log("HISTORY IMPORT FINISHED");
    console.log("Checked: " + checked);
    console.log("Results found: " + found);
    console.log("Successful: " + successful);
    console.log("Failed: " + failed);
    console.log("==============================");

    await interaction.editReply(
      "✅ History import končan!\n\n" +
      "📨 Pregledanih: " +
      checked +
      "\n" +
      "🎯 Najdenih rezultatov: " +
      found +
      "\n" +
      "✅ Uspešnih: " +
      successful +
      "\n" +
      "❌ Failed: " +
      failed
    );
  } catch (error) {
    console.error(
      "HISTORY IMPORT ERROR"
    );

    console.error(error);

    await interaction.editReply(
      "❌ Import je imel napako. Poglej Railway loge."
    );
  }
});

client.on("error", function (error) {
  console.error("DISCORD CLIENT ERROR");
  console.error(error);
});

process.on(
  "unhandledRejection",
  function (error) {
    console.error(
      "UNHANDLED REJECTION"
    );
    console.error(error);
  }
);

process.on(
  "uncaughtException",
  function (error) {
    console.error(
      "UNCAUGHT EXCEPTION"
    );
    console.error(error);
  }
);

client.login(BOT_TOKEN);
