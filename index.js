require("dotenv").config();

const fs = require("node:fs"); const path = require("node:path"); const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events, PermissionFlagsBits, } = require("discord.js");

const token = process.env.DISCORD_TOKEN; const allowedGuildId = process.env.GUILD_ID;

if (!token) throw new Error("Missing DISCORD_TOKEN."); if (!allowedGuildId) throw new Error("Missing GUILD_ID.");

const configPath = path.join(__dirname, "guild-config.json");

function loadConfig() { if (!fs.existsSync(configPath)) return {};

try { return JSON.parse(fs.readFileSync(configPath, "utf8")); } catch { return {}; } }

function saveConfig(config) { fs.writeFileSync(configPath, JSON.stringify(config, null, 2)); }

const guildConfig = loadConfig();

function getLogChannelId() { return guildConfig[allowedGuildId]?.logChannelId || null; }

function setLogChannelId(channelId) { guildConfig[allowedGuildId] = { logChannelId: channelId }; saveConfig(guildConfig); }

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, ], partials: [Partials.Channel, Partials.Message], });

function cleanText(text, maxLength = 1000) { if (!text) return "None"; return text.length > maxLength ? ${text.slice(0, maxLength - 3)}... : text; }

function isAllowedGuild(guild) { return guild && guild.id === allowedGuildId; }

async function sendLog(guild, embed) { if (!isAllowedGuild(guild)) return;

const logChannelId = getLogChannelId(); if (!logChannelId) return;

try { const logChannel = await guild.channels.fetch(logChannelId);

if (!logChannel?.isTextBased()) return; await logChannel.send({ embeds: [embed] }); 

} catch (error) { console.error("Could not send log:", error); } }

client.once(Events.ClientReady, (readyClient) => { console.log(Ready as ${readyClient.user.tag}); console.log(Restricted to guild: ${allowedGuildId}); });

client.on(Events.InteractionCreate, async (interaction) => { if (!isAllowedGuild(interaction.guild)) return;

if (interaction.isChatInputCommand() && interaction.commandName === "setlogchannel") { if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) { await interaction.reply({ content: "You need Manage Server permission to use this command.", ephemeral: true, }); return; }

const channel = interaction.options.getChannel("channel", true); if (!channel.isTextBased()) { await interaction.reply({ content: "Choose a normal text channel.", ephemeral: true, }); return; } setLogChannelId(channel.id); await interaction.reply({ content: `Logging is now set to ${channel}.`, ephemeral: true, }); return; 

}

if (interaction.isChatInputCommand()) { const options = interaction.options.data .map((option) => **${option.name}:** ${option.value ?? "None"}) .join("\n");

const embed = new EmbedBuilder() .setTitle("Slash Command Used") .setColor(0x5865f2) .addFields( { name: "User", value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true, }, { name: "Command", value: `/${interaction.commandName}`, inline: true, }, { name: "Channel", value: `<#${interaction.channelId}>`, inline: true, }, { name: "Options", value: cleanText(options || "No options"), } ) .setTimestamp(); await sendLog(interaction.guild, embed); return; 

}

if (interaction.isButton()) { const embed = new EmbedBuilder() .setTitle("Button Pressed") .setColor(0x57f287) .addFields( { name: "User", value: ${interaction.user.tag}\n\${interaction.user.id}`, inline: true, }, { name: "Button ID", value: `${interaction.customId}`, inline: true, }, { name: "Channel", value: <#${interaction.channelId}>`, inline: true, } ) .setTimestamp();

await sendLog(interaction.guild, embed); 

} });

client.on(Events.MessageCreate, async (message) => { if (!isAllowedGuild(message.guild)) return;

const logChannelId = getLogChannelId();

if (!logChannelId || message.channelId === logChannelId) return; if (!message.author.bot) return;

const embed = new EmbedBuilder() .setTitle("Bot Message / Command Result") .setColor(0xed4245) .addFields( { name: "Bot", value: ${message.author.tag}\n\${message.author.id}`, inline: true, }, { name: "Channel", value: <#${message.channelId}>`, inline: true, }, { name: "Text Content", value: cleanText(message.content || "No text content"), }, { name: "Embed Count", value: String(message.embeds.length), inline: true, } ) .setTimestamp(message.createdAt);

if (message.embeds.length > 0) { const firstEmbed = message.embeds[0];

embed.addFields( { name: "Embed Title", value: cleanText(firstEmbed.title || "No title"), }, { name: "Embed Description", value: cleanText(firstEmbed.description || "No description"), } ); 

}

await sendLog(message.guild, embed); });

client.login(token);


