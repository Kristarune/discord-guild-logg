require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
} = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const allowedGuildId = process.env.GUILD_ID;

if (!token) {
  throw new Error("Missing DISCORD_TOKEN secret.");
}

if (!allowedGuildId) {
  throw new Error("Missing GUILD_ID secret.");
}

const configPath = path.join(__dirname, "guild-config.json");
const deletedEmbedsPath = path.join(__dirname, "deleted-embeds.json");

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    console.error("Could not read guild-config.json:", error);
    return {};
  }
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function loadDeletedEmbeds() {
  if (!fs.existsSync(deletedEmbedsPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(deletedEmbedsPath, "utf8"));
  } catch (error) {
    console.error("Could not read deleted-embeds.json:", error);
    return {};
  }
}

function saveDeletedEmbeds(data) {
  fs.writeFileSync(deletedEmbedsPath, JSON.stringify(data, null, 2));
}

function generateLogId() {
  return `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

const guildConfig = loadConfig();

function getLogChannelId() {
  if (!guildConfig[allowedGuildId]) {
    return null;
  }

  return guildConfig[allowedGuildId].logChannelId || null;
}

function setLogChannelId(channelId) {
  guildConfig[allowedGuildId] = {
    logChannelId: channelId,
  };

  saveConfig(guildConfig);
}

function isAllowedGuild(guild) {
  return guild && guild.id === allowedGuildId;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once(Events.ClientReady, function (readyClient) {
  console.log("Ready as " + readyClient.user.tag);
  console.log("Only logging guild ID: " + allowedGuildId);
});

client.on(Events.InteractionCreate, async function (interaction) {
  if (!isAllowedGuild(interaction.guild)) {
    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName !== "setlogchannel") {
    return;
  }

  if (
    !interaction.memberPermissions ||
    !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    await interaction.reply({
      content: "You need the Manage Server permission to use this command.",
      ephemeral: true,
    });

    return;
  }

  const channel = interaction.options.getChannel("channel", true);

  if (!channel.isTextBased()) {
    await interaction.reply({
      content: "Choose a normal text channel.",
      ephemeral: true,
    });

    return;
  }

  setLogChannelId(channel.id);

  await interaction.reply({
    content: "Embed logging is now set to " + channel.toString(),
    ephemeral: true,
  });
});

// Log bot embeds to the log channel
client.on(Events.MessageCreate, async function (message) {
  if (!isAllowedGuild(message.guild)) {
    return;
  }

  const logChannelId = getLogChannelId();

  if (!logChannelId) {
    return;
  }

  if (message.channelId === logChannelId) {
    return;
  }

  if (!message.author.bot) {
    return;
  }

  if (message.embeds.length === 0) {
    return;
  }

  try {
    const logChannel = await message.guild.channels.fetch(logChannelId);

    if (!logChannel || !logChannel.isTextBased()) {
      return;
    }

    const originalMessageUrl =
      "https://discord.com/channels/" +
      message.guild.id +
      "/" +
      message.channelId +
      "/" +
      message.id;

    const logId = generateLogId();

    for (const embed of message.embeds) {
      const logEmbed = new EmbedBuilder()
        .setColor(embed.color || 0x4ECDC4)
        .setTitle(embed.title || "Bot Embed")
        .setDescription(embed.description || "No description")
        .addFields(
          { name: "Bot", value: `${message.author.username}`, inline: true },
          { name: "Channel", value: `<#${message.channelId}>`, inline: true },
          {
            name: "Original Message",
            value: `[Jump to message](${originalMessageUrl})`,
            inline: false,
          },
          { name: "Log ID", value: `\`${logId}\``, inline: false }
        );

      if (embed.fields && embed.fields.length > 0) {
        logEmbed.addFields(embed.fields);
      }

      if (embed.thumbnail) {
        logEmbed.setThumbnail(embed.thumbnail.url);
      }

      if (embed.image) {
        logEmbed.setImage(embed.image.url);
      }

      logEmbed.setFooter({
        text: `Logged from bot command • ${new Date().toLocaleString()}`,
      });
      logEmbed.setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });
    }
  } catch (error) {
    console.error("Could not log bot embed:", error);
  }
});

// Log deleted bot embeds to the log channel
client.on(Events.MessageDelete, async function (message) {
  if (!isAllowedGuild(message.guild)) {
    return;
  }

  const logChannelId = getLogChannelId();

  if (!logChannelId) {
    return;
  }

  if (message.channelId === logChannelId) {
    return;
  }

  if (!message.author || !message.author.bot) {
    return;
  }

  if (message.embeds.length === 0) {
    return;
  }

  try {
    const logChannel = await message.guild.channels.fetch(logChannelId);

    if (!logChannel || !logChannel.isTextBased()) {
      return;
    }

    const logId = generateLogId();

    // Save deleted embed info
    const deletedEmbeds = loadDeletedEmbeds();
    if (!deletedEmbeds[message.guild.id]) {
      deletedEmbeds[message.guild.id] = [];
    }
    deletedEmbeds[message.guild.id].push({
      logId,
      botName: message.author.username,
      channelId: message.channelId,
      messageId: message.id,
      embeds: message.embeds,
      deletedAt: new Date().toISOString(),
    });
    saveDeletedEmbeds(deletedEmbeds);

    for (const embed of message.embeds) {
      const deleteLogEmbed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle("🗑️ Bot Embed Deleted")
        .setDescription(embed.description || "No description")
        .addFields(
          { name: "Bot", value: `${message.author.username}`, inline: true },
          { name: "Channel", value: `<#${message.channelId}>`, inline: true },
          {
            name: "Original Title",
            value: embed.title || "No title",
            inline: false,
          },
          { name: "Log ID", value: `\`${logId}\``, inline: false }
        );

      if (embed.fields && embed.fields.length > 0) {
        deleteLogEmbed.addFields({
          name: "Embed Fields",
          value: embed.fields.map((f) => `**${f.name}:** ${f.value}`).join("\n"),
          inline: false,
        });
      }

      if (embed.thumbnail) {
        deleteLogEmbed.setThumbnail(embed.thumbnail.url);
      }

      if (embed.image) {
        deleteLogEmbed.setImage(embed.image.url);
      }

      deleteLogEmbed.setFooter({
        text: `Deleted embed logged • ${new Date().toLocaleString()}`,
      });
      deleteLogEmbed.setTimestamp();

      await logChannel.send({ embeds: [deleteLogEmbed] });
    }
  } catch (error) {
    console.error("Could not log deleted bot embed:", error);
  }
});

client.login(token);
