require("dotenv").config();

const { REST, Routes, SlashCommandBuilder, ChannelType } = require("discord.js");

const token = process.env.DISCORD_TOKEN; const clientId = process.env.CLIENT_ID; const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) { throw new Error("Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID."); }

const commands = [ new SlashCommandBuilder() .setName("setlogchannel") .setDescription("Set the channel used for command logs") .addChannelOption((option) => option .setName("channel") .setDescription("The log channel") .addChannelTypes(ChannelType.GuildText) .setRequired(true) ) .setDefaultMemberPermissions(0x20) .toJSON(), ];

const rest = new REST({ version: "10" }).setToken(token);

(async () => { try { console.log("Registering slash commands...");

await rest.put( Routes.applicationGuildCommands(clientId, guildId), { body: commands } ); console.log("Slash commands registered."); 

} catch (error) { console.error(error); } })();


