require("dotenv").config();

const { REST, Routes, SlashCommandBuilder, ChannelType, PermissionFlagsBits, } = require("discord.js");

const token = process.env.DISCORD_TOKEN; const clientId = process.env.CLIENT_ID; const guildId = process.env.GUILD_ID;

if (!token) { throw new Error("Missing DISCORD_TOKEN secret."); }

if (!clientId) { throw new Error("Missing CLIENT_ID secret."); }

if (!guildId) { throw new Error("Missing GUILD_ID secret."); }

const commands = [ new SlashCommandBuilder() .setName("setlogchannel") .setDescription("Set the channel where bot embeds are logged") .addChannelOption(function (option) { return option .setName("channel") .setDescription("Choose the log channel") .addChannelTypes(ChannelType.GuildText) .setRequired(true); }) .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) .toJSON(), ];

const rest = new REST({ version: "10" }).setToken(token);

async function deployCommands() { console.log("Registering /setlogchannel...");

await rest.put( Routes.applicationGuildCommands(clientId, guildId), { body: commands, } );

console.log("/setlogchannel registered successfully."); }

deployCommands().catch(function (error) { console.error(error); process.exit(1); });

