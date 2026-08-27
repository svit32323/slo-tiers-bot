const {
Client,
GatewayIntentBits,
REST,
Routes,
SlashCommandBuilder,
PermissionFlagsBits
} = require("discord.js");

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const INGEST_SECRET = process.env.DISCORD_INGEST_SECRET;

const RESULTS_CHANNEL_NAME = "⭐┃rezultati";

if (!BOT_TOKEN) {
console.error("DISCORD_BOT_TOKEN is missing");
process.exit(1);
}

if (!INGEST_SECRET) {
console.error("DISCORD_INGEST_SECRET is missing");
process.exit(1);
}

console.log("Starting SloTiers Discord Bot V8");

function parseResultEmbed(embed) {
if (!embed || !embed.title) {
return null;
}

if (!embed.title.includes("SloTiers Rezultat Testiranja")) {
return null;
}

let ign = "";
let mode = "";
let tier = "";
let playerId = "";
let testerId = "";
let notes = "";

const fields = embed.fields || [];

for (const field of fields) {
const name = String(field.name || "").toLowerCase();
const value = String(field.value || "").trim();

```
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
```

}

if (!ign || !mode || !tier) {
return null;
}

return {
player: playerId,
ign: ign,
mode: mode,
tier: tier,
tester: testerId,
notes: notes
};
}

async function sendResultToSloTiers(data) {
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

let parsed = null;

try {
parsed = JSON.parse(text);
} catch {
parsed = null;
}

return {
ok: response.ok,
status: response.status,
body: parsed || text
};
}

async function processMessage(message, source) {
if (!message.embeds || message.embeds.length === 0) {
return {
found: false,
success: false
};
}

let found = false;

for (const embed of message.embeds) {
const data = parseResultEmbed(embed);

```
if (!data) {
  continue;
}

found = true;

console.log("==============================");
console.log("SLOTIERS RESULT DETECTED");
console.log("Source: " + source);
console.log("Message ID: " + message.id);
console.log("Player ID: " + data.player);
console.log("IGN: " + data.ign);
console.log("Mode: " + data.mode);
console.log("Tier: " + data.tier);
console.log("Tester ID: " + data.tester);
console.log("Notes: " + data.notes);
console.log("==============================");

console.log("Payload: " + JSON.stringify(data));

const result = await sendResultToSloTiers(data);

console.log("SloTiers status: " + result.status);
console.log(
  "SloTiers response: " +
    JSON.stringify(result.body)
);

if (result.ok) {
  console.log("RESULT SENT SUCCESSFULLY");
} else {
  console.log("SloTiers rejected the result");
}

return {
  found: true,
  success: result.ok,
  status: result.status,
  response: result.body
};
```

}

return {
found,
success: false
};
}

client.once("ready", async function () {
console.log("=================================");
console.log("SLOTIERS BOT V8 ONLINE");
console.log("Bot: " + client.user.tag);
console.log("Servers: " + client.guilds.cache.size);
console.log("=================================");

try {
const command = new SlashCommandBuilder()
.setName("import-history")
.setDescription("Import all old SloTiers results from the results channel")
.setDefaultMemberPermissions(
PermissionFlagsBits.Administrator
);

```
const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

const guilds = client.guilds.cache;

for (const [guildId, guild] of guilds) {
  await rest.put(
    Routes.applicationGuildCommands(
      client.user.id,
      guildId
    ),
    {
      body: [command.toJSON()]
    }
  );

  console.log(
    "Registered /import-history in: " +
      guild.name
  );
}
```

} catch (error) {
console.error("COMMAND REGISTRATION ERROR");
console.error(error);
}
});

client.on("messageCreate", async function (message) {
try {
console.log("MESSAGE RECEIVED");

```
console.log(
  "Server: " +
    (message.guild ? message.guild.name : "DM")
);

console.log(
  "Channel: " +
    (message.channel ? message.channel.name : "unknown")
);

console.log("Author: " + message.author.tag);
console.log(
  "Embeds: " +
    message.embeds.length
);

if (!message.embeds.length) {
  return;
}

await processMessage(
  message,
  "automatic"
);
```

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

if (!interaction.memberPermissions.has(
PermissionFlagsBits.Administrator
)) {
await interaction.reply({
content: "Nimaš dovoljenja za ta command.",
ephemeral: true
});

```
return;
```

}

await interaction.deferReply({
ephemeral: true
});

console.log("==============================");
console.log("STARTING HISTORY IMPORT");
console.log("Guild: " + interaction.guild.name);
console.log("==============================");

const channel = interaction.guild.channels.cache.find(
function (item) {
return item.name === RESULTS_CHANNEL_NAME;
}
);

if (!channel) {
await interaction.editReply(
"Ne najdem channel-a " +
RESULTS_CHANNEL_NAME +
"."
);

```
return;
```

}

if (!channel.isTextBased()) {
await interaction.editReply(
"Rezultat channel ni text channel."
);

```
return;
```

}

let lastId = undefined;
let totalMessages = 0;
let resultsFound = 0;
let successful = 0;
let failed = 0;
let skipped = 0;

try {
while (true) {
const options = {
limit: 100
};

```
  if (lastId) {
    options.before = lastId;
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
    totalMessages++;

    const hasSloTiersEmbed =
      message.embeds &&
      message.embeds.some(function (embed) {
        return (
          embed.title &&
          embed.title.includes(
            "SloTiers Rezultat Testiranja"
          )
        );
      });

    if (!hasSloTiersEmbed) {
      skipped++;
      continue;
    }

    resultsFound++;

    const result = await processMessage(
      message,
      "history import"
    );

    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    await new Promise(function (resolve) {
      setTimeout(resolve, 300);
    });
  }

  lastId = messages.last().id;

  if (messages.size < 100) {
    break;
  }

  await new Promise(function (resolve) {
    setTimeout(resolve, 500);
  });
}

console.log("==============================");
console.log("HISTORY IMPORT FINISHED");
console.log("Messages: " + totalMessages);
console.log("Results found: " + resultsFound);
console.log("Successful: " + successful);
console.log("Failed: " + failed);
console.log("Skipped: " + skipped);
console.log("==============================");

await interaction.editReply(
  "✅ History import končan!\n\n" +
    "📨 Pregledanih messageov: " +
    totalMessages +
    "\n" +
    "🎯 Najdenih rezultatov: " +
    resultsFound +
    "\n" +
    "✅ Uspešno: " +
    successful +
    "\n" +
    "❌ Failed: " +
    failed +
    "\n" +
    "⏭️ Preskočenih: " +
    skipped
);
```

} catch (error) {
console.error("HISTORY IMPORT ERROR");
console.error(error);

```
await interaction.editReply(
  "❌ Import je crashal. Poglej Railway loge."
);
```

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

client.login(BOT_TOKEN);
