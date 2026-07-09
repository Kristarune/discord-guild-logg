const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const logsPath = path.join(__dirname, "action-logs.json");

// Load or create logs file
function loadLogs() {
  if (!fs.existsSync(logsPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(logsPath, "utf8"));
  } catch (error) {
    console.error("Could not read action-logs.json:", error);
    return {};
  }
}

// Save logs to file
function saveLogs(logs) {
  fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
}

// Generate unique log ID
function generateLogId() {
  return `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// Log an action to the log channel
async function logAction(client, guildId, logId, title, description, fields = [], color = 0x4ECDC4) {
  const configPath = path.join(__dirname, "guild-config.json");
  
  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (error) {
      return null;
    }
  }

  const logChannelId = config[guildId]?.logChannelId;
  if (!logChannelId) {
    return null;
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    const logChannel = await guild.channels.fetch(logChannelId);

    if (!logChannel || !logChannel.isTextBased()) {
      return null;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${title}`)
      .setDescription(description)
      .addFields({ name: "Log ID", value: `\`${logId}\``, inline: false })
      .addFields(fields)
      .setTimestamp();

    const message = await logChannel.send({ embeds: [embed] });
    return message.id;
  } catch (error) {
    console.error("Could not send log to channel:", error);
    return null;
  }
}

// Save action log to file
function saveActionLog(guildId, logId, messageId, type, title, description, userId, timestamp) {
  const logs = loadLogs();
  if (!logs[guildId]) {
    logs[guildId] = [];
  }
  logs[guildId].push({
    logId,
    messageId,
    type,
    title,
    description,
    userId,
    timestamp,
  });
  saveLogs(logs);
}

const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("viewactions")
      .setDescription("View all logged server actions")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const logs = loadLogs();
      const guildId = interaction.guild.id;
      
      if (!logs[guildId] || logs[guildId].length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0xFF6B6B)
          .setTitle("📋 No Actions Logged")
          .setDescription("There are no logged actions for this server yet.")
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const actions = logs[guildId];
      const embed = new EmbedBuilder()
        .setColor(0x4ECDC4)
        .setTitle("📋 Server Actions Log")
        .setDescription(`Total actions logged: **${actions.length}**`)
        .setTimestamp();

      actions.slice(-10).reverse().forEach((action) => {
        embed.addFields({
          name: `[${action.type.toUpperCase()}] ${action.title}`,
          value: `${action.description}\n**Log ID:** \`${action.logId}\`\n**Time:** <t:${Math.floor(action.timestamp / 1000)}:R>`,
          inline: false,
        });
      });

      if (actions.length > 10) {
        embed.setFooter({ text: `Showing latest 10 of ${actions.length} actions` });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("fxtwitter")
      .setDescription("Convert an X (Twitter) embed to fxtwitter embed")
      .addStringOption(option =>
        option
          .setName("url")
          .setDescription("The X (Twitter) URL to convert")
          .setRequired(true)
      ),
    async execute(interaction) {
      const url = interaction.options.getString("url");
      
      // Validate if it's an X/Twitter URL
      if (!url.includes("x.com") && !url.includes("twitter.com")) {
        return interaction.reply({
          content: "❌ Please provide a valid X/Twitter URL",
          ephemeral: true
        });
      }
      
      try {
        // Convert x.com to fxtwitter.com
        let convertedUrl = url
          .replace(/https?:\/\/(www\.)?x\.com/g, "https://fxtwitter.com")
          .replace(/https?:\/\/(www\.)?twitter\.com/g, "https://fxtwitter.com");
        
        // Remove tracking parameters
        convertedUrl = convertedUrl.split("?")[0];
        
        const embed = new EmbedBuilder()
          .setColor(0x1DA1F2)
          .setTitle("✅ fxtwitter Embed Ready")
          .setDescription(`[Click here to view](${convertedUrl})`)
          .addFields({
            name: "Converted URL",
            value: `\`${convertedUrl}\``,
            inline: false
          })
          .setTimestamp();
        
        await interaction.reply({
          embeds: [embed],
          ephemeral: false
        });
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "❌ An error occurred while converting the URL",
          ephemeral: true
        });
      }
    }
  },
];

// Export for use in index.js
module.exports = { 
  commands, 
  logAction, 
  saveActionLog, 
  generateLogId, 
  loadLogs, 
  saveLogs 
};
