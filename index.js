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

const RANK_SYNC_URL =
  "https://slotiers.hatchable.site/api/discord/sync-ranks";

const RANKING_URL =
  "https://slotiers.hatchable.site/api/discord/ranking";

const TIERS = [
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

console.log("Starting SloTiers Discord Bot");

/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
  return String(value || "").trim();
}

function getMentionId(value) {
  const match = clean(value).match(/<@!?(\d+)>/);
  return match ? match[1] : "";
}

function getCodeValue(value) {
  const text = clean(value);

  const first = text.indexOf("`");

  if (first === -1) {
    return "";
  }

  const second = text.indexOf("`", first + 1);

  if (second === -1) {
    return "";
  }

  return text
    .substring(first + 1, second)
    .trim();
}

function normalizeTier(value) {
  const upper = clean(value).toUpperCase();

  for (const tier of TIERS) {
    if (upper.includes(tier)) {
      return tier;
    }
  }

  return "";
}

/*
 * Discord role examples:
 *
 * SWORD HT1
 * SWORD LT2
 * MACE HT3
 * UHC LT4
 *
 * Also supports:
 *
 * SWORD | HT1
 * SWORD: HT1
 * SWORD - HT1
 */

function parseRankRole(roleName) {
  const name = clean(roleName).toUpperCase();

  const tierMatch = name.match(
    /\b(HT1|LT1|HT2|LT2|HT3|LT3|HT4|LT4|HT5|LT5)\b/
  );

  if (!tierMatch) {
    return null;
  }

  const tier = tierMatch[1];

  let mode = name
    .substring(0, tierMatch.index)
    .replace(/[|:_()[\]{}]/g, " ")
    .replace(/[-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!mode) {
    return null;
  }

  return {
    mode,
    tier
  };
}

/*
 * Gets Minecraft username from Discord.
 *
 * Priority:
 * 1. nickname
 * 2. global name
 * 3. Discord username
 */

function getMinecraftUsername(member) {
  const nickname = clean(member.nickname);

  if (nickname) {
    return nickname
      .replace(/^@/, "")
      .trim();
  }

  const globalName = clean(
    member.user.globalName
  );

  if (globalName) {
    return globalName
      .replace(/^@/, "")
      .trim();
  }

  return clean(
    member.user.username
  ).replace(/^@/, "");
}

/* =========================================================
   PARSE SLOTIERS RESULT EMBED
========================================================= */

function parseEmbed(embed) {
  if (!embed) {
    return null;
  }

  const title = String(embed.title || "");

  if (
    !title.includes(
      "SloTiers Rezultat Testiranja"
    )
  ) {
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
    const name =
      String(field.name || "")
        .toLowerCase();

    const value =
      String(field.value || "").trim();

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
      tier = normalizeTier(value);
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
    player,
    ign,
    mode,
    tier,
    tester,
    notes
  };
}

/* =========================================================
   SEND NORMAL RESULT TO SLOTIERS
========================================================= */

async function sendToSloTiers(data) {
  const response = await fetch(
    RANKING_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-discord-ingest-secret":
          INGEST_SECRET
      },

      body: JSON.stringify(data)
    }
  );

  const text =
    await response.text();

  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

/* =========================================================
   PROCESS RESULT MESSAGE
========================================================= */

async function processMessage(
  message,
  source
) {
  if (
    !message.embeds ||
    message.embeds.length === 0
  ) {
    return false;
  }

  for (
    const embed of message.embeds
  ) {
    const data =
      parseEmbed(embed);

    if (!data) {
      continue;
    }

    console.log(
      "=============================="
    );

    console.log(
      "SLOTIERS RESULT DETECTED"
    );

    console.log(
      "Source: " + source
    );

    console.log(
      "Message ID: " +
      message.id
    );

    console.log(
      "Player: " +
      data.player
    );

    console.log(
      "IGN: " +
      data.ign
    );

    console.log(
      "Mode: " +
      data.mode
    );

    console.log(
      "Tier: " +
      data.tier
    );

    console.log(
      "Tester: " +
      data.tester
    );

    console.log(
      "Notes: " +
      data.notes
    );

    console.log(
      "=============================="
    );

    const result =
      await sendToSloTiers(
        data
      );

    console.log(
      "SloTiers status: " +
      result.status
    );

    console.log(
      "SloTiers response: " +
      JSON.stringify(
        result.body
      )
    );

    if (result.ok) {
      console.log(
        "RESULT SENT SUCCESSFULLY"
      );

      return true;
    }

    console.log(
      "SloTiers rejected the result"
    );

    return false;
  }

  return false;
}

/* =========================================================
   GET MEMBER RANKS
========================================================= */

function getMemberRanks(member) {
  const ranks = [];

  for (
    const role of
    member.roles.cache.values()
  ) {
    if (role.managed) {
      continue;
    }

    const parsed =
      parseRankRole(
        role.name
      );

    if (!parsed) {
      continue;
    }

    ranks.push({
      mode: parsed.mode,
      tier: parsed.tier,
      role_id: role.id,
      role_name: role.name
    });
  }

  return ranks;
}

/* =========================================================
   SYNC ALL DISCORD MEMBERS
========================================================= */

async function syncRanks(guild) {
  console.log(
    "=============================="
  );

  console.log(
    "STARTING FULL RANK SYNC"
  );

  console.log(
    "Guild: " +
    guild.name
  );

  console.log(
    "Guild ID: " +
    guild.id
  );

  console.log(
    "=============================="
  );

  /*
   * Fetch ALL guild members.
   */

  await guild.members.fetch();

  const members =
    [...guild.members.cache.values()];

  console.log(
    "Discord members fetched: " +
    members.length
  );

  const players = [];

  let membersChecked = 0;
  let membersWithRanks = 0;
  let ranksFound = 0;
  let botsSkipped = 0;
  let noRankSkipped = 0;

  for (
    const member of members
  ) {
    membersChecked++;

    if (member.user.bot) {
      botsSkipped++;
      continue;
    }

    const ranks =
      getMemberRanks(
        member
      );

    if (
      ranks.length === 0
    ) {
      noRankSkipped++;
      continue;
    }

    membersWithRanks++;
    ranksFound += ranks.length;

    const ign =
      getMinecraftUsername(
        member
      );

    if (!ign) {
      noRankSkipped++;
      continue;
    }

    console.log(
      "------------------------------"
    );

    console.log(
      "Member: " +
      member.user.tag
    );

    console.log(
      "Discord ID: " +
      member.id
    );

    console.log(
      "IGN: " +
      ign
    );

    console.log(
      "Ranks: " +
      JSON.stringify(ranks)
    );

    players.push({
      discord_id: member.id,

      discord_username:
        member.user.username,

      discord_display_name:
        member.user.globalName ||
        member.user.username,

      ign,

      ranks
    });
  }

  console.log(
    "=============================="
  );

  console.log(
    "MEMBER SCAN FINISHED"
  );

  console.log(
    "Members checked: " +
    membersChecked
  );

  console.log(
    "Members with ranks: " +
    membersWithRanks
  );

  console.log(
    "Ranks found: " +
    ranksFound
  );

  console.log(
    "Bots skipped: " +
    botsSkipped
  );

  console.log(
    "No rank skipped: " +
    noRankSkipped
  );

  console.log(
    "Players to sync: " +
    players.length
  );

  console.log(
    "=============================="
  );

  if (
    players.length === 0
  ) {
    return {
      membersChecked,
      membersWithRanks,
      ranksFound,
      botsSkipped,
      noRankSkipped,
      playersCreated: 0,
      playersUpdated: 0,
      ranksAdded: 0,
      ranksUpdated: 0,
      failed: 0
    };
  }

  /*
   * Send ALL players in one request.
   *
   * This is important because the SloTiers
   * endpoint is optimized for batch sync.
   */

  const response =
    await fetch(
      RANK_SYNC_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-discord-ingest-secret":
            INGEST_SECRET
        },

        body: JSON.stringify({
          guild_id: guild.id,
          guild_name: guild.name,
          players
        })
      }
    );

  const text =
    await response.text();

  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  console.log(
    "=============================="
  );

  console.log(
    "SLOTIERS SYNC STATUS: " +
    response.status
  );

  console.log(
    "SLOTIERS SYNC RESPONSE:"
  );

  console.log(
    JSON.stringify(
      body,
      null,
      2
    )
  );

  console.log(
    "=============================="
  );

  if (!response.ok) {
    throw new Error(
      "SloTiers sync failed: " +
      response.status +
      " " +
      text
    );
  }

  return {
    membersChecked,

    membersWithRanks,

    ranksFound,

    botsSkipped,

    noRankSkipped,

    playersCreated:
      Number(
        body.players_added || 0
      ),

    playersUpdated:
      Number(
        body.players_updated || 0
      ),

    ranksAdded:
      Number(
        body.ranks_added || 0
      ),

    ranksUpdated:
      Number(
        body.ranks_updated || 0
      ),

    failed:
      Number(
        body.failed || 0
      )
  };
}

/* =========================================================
   BOT READY
========================================================= */

client.once(
  "clientReady",
  async function () {
    console.log(
      "================================="
    );

    console.log(
      "SLOTIERS BOT ONLINE"
    );

    console.log(
      "Bot: " +
      client.user.tag
    );

    console.log(
      "Servers: " +
      client.guilds.cache.size
    );

    console.log(
      "================================="
    );

    try {
      const importHistory =
        new SlashCommandBuilder()
          .setName(
            "import-history"
          )
          .setDescription(
            "Import old SloTiers results from the results channel"
          )
          .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
          );

      const syncRanks =
        new SlashCommandBuilder()
          .setName(
            "sync-ranks"
          )
          .setDescription(
            "Sync all Discord SloTiers roles into the SloTiers tierlist"
          )
          .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
          );

      const rest =
        new REST({
          version: "10"
        }).setToken(
          BOT_TOKEN
        );

      for (
        const guild of
        client.guilds.cache.values()
      ) {
        await rest.put(
          Routes.applicationGuildCommands(
            client.user.id,
            guild.id
          ),
          {
            body: [
              importHistory.toJSON(),
              syncRanks.toJSON()
            ]
          }
        );

        console.log(
          "Commands registered in " +
          guild.name
        );
      }
    } catch (error) {
      console.error(
        "COMMAND REGISTRATION ERROR"
      );

      console.error(error);
    }
  }
);

/* =========================================================
   AUTOMATIC RESULT LISTENER
========================================================= */

client.on(
  "messageCreate",
  async function (
    message
  ) {
    try {
      console.log(
        "MESSAGE RECEIVED"
      );

      console.log(
        "Server: " +
        (
          message.guild
            ? message.guild.name
            : "DM"
        )
      );

      console.log(
        "Channel: " +
        (
          message.channel
            ? message.channel.name
            : "unknown"
        )
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
      console.error(
        "MESSAGE HANDLER ERROR"
      );

      console.error(error);
    }
  }
);

/* =========================================================
   SLASH COMMAND HANDLER
========================================================= */

client.on(
  "interactionCreate",
  async function (
    interaction
  ) {
    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }

    /* =========================================
       /sync-ranks
    ========================================= */

    if (
      interaction.commandName ===
      "sync-ranks"
    ) {
      if (
        !interaction.memberPermissions ||
        !interaction.memberPermissions.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        await interaction.reply({
          content:
            "❌ Nimaš dovoljenja za ta command.",
          ephemeral: true
        });

        return;
      }

      await interaction.deferReply({
        ephemeral: true
      });

      try {
        const result =
          await syncRanks(
            interaction.guild
          );

        await interaction.editReply(
          "✅ **SloTiers rank sync končan!**\n\n" +

          "👥 Pregledanih članov: **" +
          result.membersChecked +
          "**\n" +

          "🏆 Članov z ranki: **" +
          result.membersWithRanks +
          "**\n" +

          "🎯 Najdenih rankov: **" +
          result.ranksFound +
          "**\n" +

          "➕ Novih igralcev: **" +
          result.playersCreated +
          "**\n" +

          "🔄 Posodobljenih igralcev: **" +
          result.playersUpdated +
          "**\n" +

          "🆕 Dodanih rankov: **" +
          result.ranksAdded +
          "**\n" +

          "♻️ Posodobljenih rankov: **" +
          result.ranksUpdated +
          "**\n" +

          "🤖 Botov preskočenih: **" +
          result.botsSkipped +
          "**\n" +

          "⏭️ Brez ranka: **" +
          result.noRankSkipped +
          "**\n" +

          "❌ Failed: **" +
          result.failed +
          "**"
        );
      } catch (error) {
        console.error(
          "SYNC RANKS ERROR"
        );

        console.error(error);

        await interaction.editReply(
          "❌ **Sync je padel.**\n\n" +
          "Napaka: `" +
          String(
            error.message ||
            error
          ) +
          "`"
        );
      }

      return;
    }

    /* =========================================
       /import-history
    ========================================= */

    if (
      interaction.commandName !==
      "import-history"
    ) {
      return;
    }

    if (
      !interaction.memberPermissions ||
      !interaction.memberPermissions.has(
        PermissionFlagsBits.Administrator
      )
    ) {
      await interaction.reply({
        content:
          "Nimaš dovoljenja za ta command.",
        ephemeral: true
      });

      return;
    }

    await interaction.deferReply({
      ephemeral: true
    });

    console.log(
      "=============================="
    );

    console.log(
      "STARTING HISTORY IMPORT"
    );

    console.log(
      "=============================="
    );

    const channel =
      interaction.guild.channels.cache.find(
        function (
          item
        ) {
          return (
            item.name ===
            RESULTS_CHANNEL
          );
        }
      );

    if (!channel) {
      await interaction.editReply(
        "❌ Ne najdem channel-a " +
        RESULTS_CHANNEL
      );

      return;
    }

    if (
      !channel.isTextBased()
    ) {
      await interaction.editReply(
        "❌ Ta channel ni text channel."
      );

      return;
    }

    let before =
      undefined;

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
          options.before =
            before;
        }

        const messages =
          await channel.messages.fetch(
            options
          );

        if (
          messages.size === 0
        ) {
          break;
        }

        console.log(
          "Fetched " +
          messages.size +
          " messages"
        );

        for (
          const message of
          messages.values()
        ) {
          checked++;

          const isResult =
            message.embeds &&
            message.embeds.some(
              function (
                embed
              ) {
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
            function (
              resolve
            ) {
              setTimeout(
                resolve,
                300
              );
            }
          );
        }

        before =
          messages.last().id;

        if (
          messages.size < 100
        ) {
          break;
        }

        await new Promise(
          function (
            resolve
          ) {
            setTimeout(
              resolve,
              500
            );
          }
        );
      }

      console.log(
        "=============================="
      );

      console.log(
        "HISTORY IMPORT FINISHED"
      );

      console.log(
        "Checked: " +
        checked
      );

      console.log(
        "Results found: " +
        found
      );

      console.log(
        "Successful: " +
        successful
      );

      console.log(
        "Failed: " +
        failed
      );

      console.log(
        "=============================="
      );

      await interaction.editReply(
        "✅ **History import končan!**\n\n" +

        "📨 Pregledanih: **" +
        checked +
        "**\n" +

        "🎯 Najdenih rezultatov: **" +
        found +
        "**\n" +

        "✅ Uspešnih: **" +
        successful +
        "**\n" +

        "❌ Failed: **" +
        failed +
        "**"
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
  }
);

/* =========================================================
   ERRORS
========================================================= */

client.on(
  "error",
  function (
    error
  ) {
    console.error(
      "DISCORD CLIENT ERROR"
    );

    console.error(error);
  }
);

process.on(
  "unhandledRejection",
  function (
    error
  ) {
    console.error(
      "UNHANDLED REJECTION"
    );

    console.error(error);
  }
);

process.on(
  "uncaughtException",
  function (
    error
  ) {
    console.error(
      "UNCAUGHT EXCEPTION"
    );

    console.error(error);
  }
);

/* =========================================================
   LOGIN
========================================================= */

client.login(
  BOT_TOKEN
);
