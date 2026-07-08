const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const logsPath = path.join(__dirname, "logs.json");

// Load or create logs file
function loadLogs() {
  if (!fs.existsSync(logsPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(logsPath, "utf8"));
  } catch (error) {
    console.error("Could not read logs.json:", error);
    return {};
  }
}

// Save logs to file
function saveLogs(logs) {
  fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
}

// Generate unique log ID
function generateLogId() {
  return `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("viewlogs")
      .setDescription("View all saved log entries")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const logs = loadLogs();
      const guildId = interaction.guild.id;
      
      if (!logs[guildId] || logs[guildId].length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0xFF6B6B)
          .setTitle("📋 No Logs Found")
          .setDescription("There are no saved logs for this server yet.")
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const guildLogs = logs[guildId];
      const embed = new EmbedBuilder()
        .setColor(0x4ECDC4)
        .setTitle("📋 Server Logs")
        .setDescription(`Total logs: **${guildLogs.length}**`)
        .setTimestamp();

      guildLogs.slice(0, 25).forEach((log) => {
        embed.addFields({
          name: `${log.logId}`,
          value: `**User:** ${log.userName}\n**Action:** ${log.action}\n**Time:** <t:${Math.floor(log.timestamp / 1000)}:R>`,
          inline: false,
        });
      });

      if (guildLogs.length > 25) {
        embed.setFooter({ text: `Showing 25 of ${guildLogs.length} logs` });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName("deletelogs")
      .setDescription("Delete all saved logs for this server")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const logs = loadLogs();
      const guildId = interaction.guild.id;
      
      if (!logs[guildId] || logs[guildId].length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0xFF6B6B)
          .setTitle("❌ No Logs to Delete")
          .setDescription("There are no logs to delete for this server.")
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      delete logs[guildId];
      saveLogs(logs);

      const embed = new EmbedBuilder()
        .setColor(0x95E1D3)
        .setTitle("✅ Logs Deleted")
        .setDescription("All saved logs for this server have been deleted.")
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName("loginfo")
      .setDescription("View detailed information about a specific log entry")
      .addStringOption((option) =>
        option
          .setName("log_id")
          .setDescription("The Log ID to view")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const logs = loadLogs();
      const guildId = interaction.guild.id;
      const logId = interaction.options.getString("log_id");

      if (!logs[guildId]) {
        const embed = new EmbedBuilder()
          .setColor(0xFF6B6B)
          .setTitle("❌ Log Not Found")
          .setDescription("This server has no logs.")
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const log = logs[guildId].find((l) => l.logId === logId);

      if (!log) {
        const embed = new EmbedBuilder()
          .setColor(0xFF6B6B)
          .setTitle("❌ Log Not Found")
          .setDescription(`Log ID **${logId}** could not be found.`)
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x4ECDC4)
        .setTitle("📋 Log Details")
        .addFields(
          { name: "Log ID", value: log.logId, inline: true },
          { name: "User", value: log.userName, inline: true },
          { name: "User ID", value: log.userId, inline: true },
          { name: "Action", value: log.action, inline: false },
          { name: "Details", value: log.details || "No additional details", inline: false },
          { name: "Timestamp", value: `<t:${Math.floor(log.timestamp / 1000)}:F>`, inline: false }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },
];

// Function to add a log entry
function addLogEntry(guildId, userName, userId, action, details = "") {
  const logs = loadLogs();
  const logId = generateLogId();

  if (!logs[guildId]) {
    logs[guildId] = [];
  }

  logs[guildId].push({
    logId,
    userName,
    userId,
    action,
    details,
    timestamp: Date.now(),
  });

  saveLogs(logs);
  return logId;
}

module.exports = { commands, addLogEntry, loadLogs, saveLogs };
