require("dotenv").config();

const { REST, Routes } = require("discord.js");
const { commands: commandsArray } = require("./commands.js");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token) { throw new Error("Missing DISCORD_TOKEN secret."); }
if (!clientId) { throw new Error("Missing CLIENT_ID secret."); }
if (!guildId) { throw new Error("Missing GUILD_ID secret."); }

// Extract the command data
const commands = commandsArray.map(cmd => cmd.data.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

async function deployCommands() {
  console.log(`Registering ${commands.length} commands...`);
  
  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );
  
  console.log("Commands registered successfully.");
}

deployCommands().catch(function (error) { 
  console.error(error); 
  process.exit(1); 
});
