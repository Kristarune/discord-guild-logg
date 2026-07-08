require("dotenv").config();

const fs = require("node:fs"); const path = require("node:path"); const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events, PermissionFlagsBits, } = require("discord.js");

const token = process.env.DISCORD_TOKEN; const allowedGuildId = process.env.GUILD_ID;

if (!token) { throw new Error("Missing DISCORD_TOKEN secret."); }

if (!allowedGuildId) { throw new Error("Missing GUILD_ID secret."); }

const configPath = path.join(__dirname, "guild-config.json");

function loadConfig() { if (!fs.existsSync(configPath)) { return {}; }

try { return JSON.parse(fs.readFileSync(configPath, "utf8")); } catch (error) { console.error("Could not read guild-config.json:", error); return {}; } }

function saveConfig(config) { fs.writeFileSync(configPath, JSON.stringify(config, null, 2)); }

const guildConfig = loadConfig();

function getLogChannelId() { if (!guildConfig[allowedGuildId]) { return null; }

return guildConfig[allowedGuildId].logChannelId || null; }

function setLogChannelId(channelId) { guildConfig[allowedGuildId] = { logChannelId: channelId, };

saveConfig(guildConfig); }

function isAllowedGuild(guild) { return guild && guild.id === allowedGuildId; }

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, ], partials: [ Partials.Channel, Partials.Message, ], });

client.once(Events.ClientReady, function (readyClient) { console.log("Ready as " + readyClient.user.tag); console.log("Only logging guild ID: " + allowedGuildId); });

client.on(Events.InteractionCreate, async function (interaction) { if (!isAllowedGuild(interaction.guild)) { return; }

if (!interaction.isChatInputCommand()) { return; }

if (interaction.commandName !== "setlogchannel") { return; }

if ( !interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ) { await interaction.reply({ content: "You need the Manage Server permission to use this command.", ephemeral: true, });

return; 

}

const channel = interaction.options.getChannel("channel", true);

if (!channel.isTextBased()) { await interaction.reply({ content: "Choose a normal text channel.", ephemeral: true, });

return; 

}

setLogChannelId(channel.id);

await interaction.reply({ content: "Embed logging is now set to " + channel.toString(), ephemeral: true, }); });

client.on(Events.MessageCreate, async function (message) { if (!isAllowedGuild(message.guild)) { return; }

const logChannelId = getLogChannelId();

if (!logChannelId) { return; }

if (message.channelId === logChannelId) { return; }

if (!message.author.bot) { return; }

if (message.embeds.length === 0) { return; }

try { const logChannel = await message.guild.channels.fetch(logChannelId);

if (!logChannel || !logChannel.isTextBased()) { return; } const originalMessageUrl = "https://discord.com/channels/" + message.guild.id + "/" + message.channelId + "/" + message.id; const header = new EmbedBuilder() .setTitle("Bot Embed Logged") .setColor(0x5865f2) .addFields( { name: "Bot", value: message.author.tag, inline: true, }, { name: "Original Channel", value: "<#" + message.channelId + ">", inline: true, }, { name: "Original Message", value: originalMessageUrl, } ) .setTimestamp(message.createdAt); await logChannel.send({ embeds: [header], }); await logChannel.send({ content: "Embed copied from " + message.author.tag, embeds: message.embeds.slice(0, 10), }); 

} catch (error) { console.error("Could not copy bot embed:", error); } });

client.login(token);

