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

const MEMBER_SYNC_URL =
  "https://slotiers.hatchable.site/api/discord/sync-member";

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

const MODE_ALIASES = {
  SWORD: "SWORD",
  SWORDS: "SWORD",
  SWORDING: "SWORD",

  SMP: "SMP",

  UHC: "UHC",

  MACE: "MACE",
  MACES: "MACE",

  POT: "POT",
  POTS: "POT",
  POTION: "POT",
  POTIONS: "POT",

  AXE: "AXE",
  AXES: "AXE",

  CART: "CART",
  CARTS: "CART",
  TNTCART: "CART",
  "TNT CART": "CART",

  "NETH POT": "NETH POT",
  "NETHER POT": "NETH POT",
  "NETHERITE POT": "NETH POT",
  "NETHER POTIONS": "NETH POT",
  "NETHERITE POTIONS": "NETH POT",

  VANILLA: "VANILLA",

  "SPEAR MACE": "SPEAR MACE",
  "SPEAR MACES": "SPEAR MACE",
  SPEAR: "SPEAR MACE"
};

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

let syncInProgress = false;

const pendingMemberSyncs = new Map();

console.log("Starting SloTiers Discord Bot");

/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* =========================================================
   TIER
========================================================= */

function findTier(text) {
  const upper = clean(text).toUpperCase();

  const match = upper.match(
    /\b(HT1|LT1|HT2|LT2|HT3|LT3|HT4|LT4|HT5|LT5)\b/
  );

  return match ? match[1] : "";
}

/* =========================================================
   MODE
========================================================= */

function normalizeMode(value) {
  let mode = clean(value)
    .toUpperCase()
    .replace(/[|:_()[\]{}<>]/g, " ")
    .replace(/[-–—•·/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return MODE_ALIASES[mode] || "";
}

function findMode(roleName) {
  const upper = clean(roleName).toUpperCase();

  const orderedModes = [
    "SPEAR MACE",
    "NETH POT",
    "NETHERITE POT",
    "NETHER POT",
    "TNT CART",
    "SWORD",
    "SMP",
    "UHC",
    "MACE",
    "POT",
    "AXE",
    "CART",
    "VANILLA",
    "SPEAR"
  ];

  for (const mode of orderedModes) {
    const escaped =
      mode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(
      `(?:^|[^A-Z0-9])${escaped}(?:$|[^A-Z0-9])`
    );

    if (regex.test(upper)) {
      return normalizeMode(mode);
    }
  }

  return "";
}

/* =========================================================
   PARSE RANK ROLE
========================================================= */

function parseRankRole(roleName) {
  const original = clean(roleName);

  if (!original) {
    return null;
  }

  const tier = findTier(original);

  if (!tier) {
    return null;
  }

  const mode = findMode(original);

  if (!mode) {
    return null;
  }

  return {
    mode,
    tier
  };
}

/* =========================================================
   GET MEMBER RANKS
========================================================= */

function getMemberRanks(member) {
  const ranks = [];
  const seen = new Set();

  for (const role of member.roles.cache.values()) {
    if (role.managed) {
      continue;
    }

    const parsed = parseRankRole(role.name);

    if (!parsed) {
      continue;
    }

    const key =
      `${parsed.mode}:${parsed.tier}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

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
   MINECRAFT USERNAME
========================================================= */

function getMinecraftUsername(member) {
  /*
   * Minecraft IGN:
   *
   * 1. Discord nickname
   * 2. Discord global name
   * 3. Discord username
   */

  const nickname =
    clean(member.nickname);

  if (nickname) {
    return nickname
      .replace(/^@/, "")
      .trim();
  }

  const globalName =
    clean(member.user.globalName);

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
   SEND SINGLE MEMBER TO SLOTIERS
========================================================= */

async function sendMemberToSloTiers(member) {
  const ign =
    getMinecraftUsername(member);

  const ranks =
    getMemberRanks(member);

  const data = {
    member: {
      discord_id: member.id,

      discord_username:
        member.user.username,

      discord_display_name:
        member.user.globalName ||
        member.user.username,

      ign,

      ranks
    }
  };

  console.log(
    "================================="
  );

  console.log(
    "[MEMBER SYNC] Sending player"
  );

  console.log(
    "Discord: " +
    member.user.tag
  );

  console.log(
    "IGN: " +
    ign
  );

  console.log(
    "Ranks: " +
    JSON.stringify(ranks)
  );

  console.log(
    "================================="
  );

  const response =
    await fetch(
      MEMBER_SYNC_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-discord-ingest-secret":
            INGEST_SECRET
        },

        body:
          JSON.stringify(data)
      }
    );

  const text =
    await response.text();

  let body;

  try {
    body =
      JSON.parse(text);
  } catch {
    body = text;
  }

  console.log(
    "[MEMBER SYNC] HTTP " +
    response.status
  );

  console.log(
    "[MEMBER SYNC] Response:"
  );

  console.log(
    JSON.stringify(
      body,
      null,
      2
    )
  );

  if (!response.ok) {
    throw new Error(
      `Member sync failed: ${response.status} ${text}`
    );
  }

  return body;
}

/* =========================================================
   CHECK IF RANK ROLES CHANGED
========================================================= */

function getRankRoleMap(member) {
  const result = new Map();

  for (const role of member.roles.cache.values()) {
    if (role.managed) {
      continue;
    }

    const parsed =
      parseRankRole(role.name);

    if (!parsed) {
      continue;
    }

    const key =
      `${parsed.mode}:${parsed.tier}`;

    result.set(
      key,
      role.id
    );
  }

  return result;
}

function rankRolesChanged(
  oldMember,
  newMember
) {
  const oldRanks =
    getRankRoleMap(oldMember);

  const newRanks =
    getRankRoleMap(newMember);

  if (
    oldRanks.size !==
    newRanks.size
  ) {
    return true;
  }

  for (const key of oldRanks.keys()) {
    if (!newRanks.has(key)) {
      return true;
    }
  }

  for (const key of newRanks.keys()) {
    if (!oldRanks.has(key)) {
      return true;
    }
  }

  return false;
}

/* =========================================================
   AUTOMATIC SINGLE PLAYER SYNC
========================================================= */

function queueMemberSync(member) {
  const guildId =
    member.guild.id;

  const memberId =
    member.id;

  const key =
    `${guildId}:${memberId}`;

  if (
    pendingMemberSyncs.has(key)
  ) {
    clearTimeout(
      pendingMemberSyncs.get(key)
    );
  }

  const timeout =
    setTimeout(
      async function () {
        pendingMemberSyncs.delete(key);

        try {
          /*
           * Fetch the newest version of the member.
           * This makes sure we sync the FINAL role state
           * if several roles were changed quickly.
           */

          const freshMember =
            await member.guild.members.fetch(
              member.id
            );

          if (
            freshMember.user.bot
          ) {
            return;
          }

          await sendMemberToSloTiers(
            freshMember
          );

          console.log(
            `[AUTO SYNC] ${freshMember.user.tag} synced successfully`
          );
        } catch (error) {
          console.error(
            "[AUTO SYNC] SINGLE MEMBER SYNC ERROR"
          );

          console.error(error);
        }
      },
      1500
    );

  pendingMemberSyncs.set(
    key,
    timeout
  );
}

/* =========================================================
   DISCORD ROLE CHANGE EVENT
========================================================= */

client.on(
  "guildMemberUpdate",
  async function (
    oldMember,
    newMember
  ) {
    try {
      if (
        newMember.user.bot
      ) {
        return;
      }

      /*
       * Ignore nickname/avatar/etc.
       * Only react to actual SloTiers rank changes.
       */

      if (
        !rankRolesChanged(
          oldMember,
          newMember
        )
      ) {
        return;
      }

      console.log(
        "================================="
      );

      console.log(
        "[AUTO SYNC] RANK CHANGE DETECTED"
      );

      console.log(
        "Player: " +
        newMember.user.tag
      );

      console.log(
        "OLD RANKS:"
      );

      console.log(
        JSON.stringify(
          getMemberRanks(oldMember),
          null,
          2
        )
      );

      console.log(
        "NEW RANKS:"
      );

      console.log(
        JSON.stringify(
          getMemberRanks(newMember),
          null,
          2
        )
      );

      console.log(
        "================================="
      );

      queueMemberSync(
        newMember
      );
    } catch (error) {
      console.error(
        "[AUTO SYNC] guildMemberUpdate ERROR"
      );

      console.error(error);
    }
  }
);

/* =========================================================
   FETCH ALL MEMBERS
========================================================= */

async function fetchAllMembers(guild) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= 8;
    attempt++
  ) {
    try {
      console.log(
        `[MEMBERS] Fetching ALL members ` +
        `(attempt ${attempt}/8)`
      );

      const members =
        await guild.members.fetch({
          withPresences: false
        });

      console.log(
        `[MEMBERS] Received ${members.size} members`
      );

      if (
        guild.memberCount &&
        members.size <
          guild.memberCount
      ) {
        lastError =
          new Error(
            `Incomplete member fetch: ` +
            `${members.size}/${guild.memberCount}`
          );

        if (attempt < 8) {
          const wait =
            Math.min(
              30000,
              attempt * 4000
            );

          await sleep(wait);
          continue;
        }

        throw lastError;
      }

      return [
        ...members.values()
      ];
    } catch (error) {
      lastError = error;

      console.error(
        `[MEMBERS] Attempt ${attempt} failed`
      );

      console.error(error);

      if (attempt >= 8) {
        throw error;
      }

      const wait =
        Math.min(
          30000,
          attempt * 4000
        );

      await sleep(wait);
    }
  }

  throw (
    lastError ||
    new Error(
      "Could not fetch all Discord members"
    )
  );
}

/* =========================================================
   COMPLETE SERVER SYNC
========================================================= */

async function syncRanks(guild) {
  if (syncInProgress) {
    throw new Error(
      "Sync je že v teku."
    );
  }

  syncInProgress = true;

  try {
    console.log(
      "================================="
    );

    console.log(
      "STARTING COMPLETE RANK SYNC"
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
      "Member count: " +
      guild.memberCount
    );

    console.log(
      "================================="
    );

    const members =
      await fetchAllMembers(guild);

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

      if (
        member.user.bot
      ) {
        botsSkipped++;
        continue;
      }

      const ranks =
        getMemberRanks(member);

      if (
        ranks.length === 0
      ) {
        noRankSkipped++;
        continue;
      }

      membersWithRanks++;

      ranksFound +=
        ranks.length;

      const ign =
        getMinecraftUsername(member);

      if (!ign) {
        noRankSkipped++;
        continue;
      }

      players.push({
        discord_id:
          member.id,

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
      `[SYNC] Players: ${players.length}`
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

          body:
            JSON.stringify({
              guild_id:
                guild.id,

              guild_name:
                guild.name,

              players
            })
        }
      );

    const text =
      await response.text();

    let body;

    try {
      body =
        JSON.parse(text);
    } catch {
      body = text;
    }

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
          body.players_added ||
          body.players_created ||
          0
        ),

      playersUpdated:
        Number(
          body.players_updated ||
          0
        ),

      ranksAdded:
        Number(
          body.ranks_added ||
          0
        ),

      ranksUpdated:
        Number(
          body.ranks_updated ||
          0
        ),

      failed:
        Number(
          body.failed ||
          0
        )
    };
  } finally {
    syncInProgress = false;
  }
}

/* =========================================================
   EMBED HELPERS
========================================================= */

function getMentionId(value) {
  const match =
    clean(value).match(
      /<@!?(\d+)>/
    );

  return match
    ? match[1]
    : "";
}

function getCodeValue(value) {
  const text =
    clean(value);

  const first =
    text.indexOf("`");

  if (first === -1) {
    return "";
  }

  const second =
    text.indexOf(
      "`",
      first + 1
    );

  if (second === -1) {
    return "";
  }

  return text
    .substring(
      first + 1,
      second
    )
    .trim();
}

/* =========================================================
   PARSE RESULT EMBED
========================================================= */

function parseEmbed(embed) {
  if (!embed) {
    return null;
  }

  const title =
    String(
      embed.title || ""
    );

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

  const fields =
    embed.fields || [];

  for (
    const field of fields
  ) {
    const name =
      String(
        field.name || ""
      ).toLowerCase();

    const value =
      String(
        field.value || ""
      ).trim();

    if (
      name.includes("igralec") ||
      name.includes("player")
    ) {
      player =
        getMentionId(value);

      const code =
        getCodeValue(value);

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
      tier =
        findTier(value);
    }

    if (
      name.includes("tester") ||
      name.includes("tested by")
    ) {
      tester =
        getMentionId(value);
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

  if (
    !ign ||
    !mode ||
    !tier
  ) {
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
   SEND RESULT
========================================================= */

async function sendToSloTiers(data) {
  const response =
    await fetch(
      RANKING_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-discord-ingest-secret":
            INGEST_SECRET
        },

        body:
          JSON.stringify(data)
      }
    );

  const text =
    await response.text();

  let body;

  try {
    body =
      JSON.parse(text);
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
    const embed of
    message.embeds
  ) {
    const data =
      parseEmbed(embed);

    if (!data) {
      continue;
    }

    console.log(
      "SLOTIERS RESULT DETECTED"
    );

    console.log(
      "Source: " +
      source
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

    const result =
      await sendToSloTiers(data);

    if (result.ok) {
      console.log(
        "RESULT SENT SUCCESSFULLY"
      );

      return true;
    }

    console.log(
      "SloTiers rejected result"
    );

    console.log(
      JSON.stringify(
        result.body
      )
    );

    return false;
  }

  return false;
}

/* =========================================================
   READY
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
      "GuildMembers intent: ENABLED"
    );

    console.log(
      "Automatic single-player rank sync: ENABLED"
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

      const syncRanksCommand =
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
              syncRanksCommand.toJSON()
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
   MESSAGE LISTENER
========================================================= */

client.on(
  "messageCreate",
  async function (
    message
  ) {
    try {
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
   COMMANDS
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

      if (syncInProgress) {
        await interaction.reply({
          content:
            "⏳ Sync je že v teku.",
          ephemeral: true
        });

        return;
      }

      await interaction.deferReply({
        ephemeral: true
      });

      try {
        await interaction.editReply(
          "⏳ **Pregledujem VSE člane Discord serverja...**"
        );

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

    const channel =
      interaction.guild.channels.cache.find(
        function (item) {
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

    let before;

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

        for (
          const message of
          messages.values()
        ) {
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

          await sleep(300);
        }

        before =
          messages.last().id;

        if (
          messages.size < 100
        ) {
          break;
        }

        await sleep(500);
      }

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
  function (error) {
    console.error(
      "DISCORD CLIENT ERROR"
    );

    console.error(error);
  }
);

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

/* =========================================================
   LOGIN
========================================================= */

client.login(
  BOT_TOKEN
);
