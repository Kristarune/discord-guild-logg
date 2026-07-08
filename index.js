require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  Events,
} = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const logChannelId = process.env.LOG_CHANNEL_ID;

if (!token) {
  throw new Error("Missing DISCORD_TOKEN secret.");
}

if (!logChannelId) {
  throw new Error("Missing LOG_CHANNEL_ID secret.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
  ],
});

async function getLogChannel(guild) {
  try {
    const channel = await guild.channels.fetch(logChannelId);
    return channel?.isTextBased() ? channel : null;
  } catch {
    return null;
  }
}

async function sendLog(guild, embed) {
  const logChannel = await getLogChannel(guild);

  if (!logChannel) {
    console.log(`Cannot find log channel in ${guild.name}`);
    return;
  }

  try {
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Failed to send log:", error);
  }
}

function cleanText(text, maxLength = 1000) {
  if (!text) return "None";
  return text.length > maxLength
    ? `${text.slice(0, maxLength - 3)}...`
    : text;
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready as ${readyClient.user.tag}`);
  console.log(`Logging to channel ID: ${logChannelId}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.guild) return;

  if (interaction.isChatInputCommand()) {
    const options = interaction.options.data
      .map((option) => {
        let value = option.value;

        if (option.user) value = `${option.user.tag} (${option.user.id})`;
        if (option.member) value = `${option.member.user.tag} (${option.member.id})`;
        if (option.channel) value = `#${option.channel.name}`;
        if (option.role) value = `@${option.role.name}`;

        return `**${option.name}:** ${value ?? "None"}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("Slash Command Used")
      .setColor(0x5865f2)
      .addFields(
        {
          name: "User",
          value: `${interaction.user.tag}\n\`${interaction.user.id}\``,
          inline: true,
        },
        {
          name: "Command",
          value: `/${interaction.commandName}`,
          inline: true,
        },
        {
          name: "Channel",
          value: `<#${interaction.channelId}>`,
          inline: true,
        },
        {
          name: "Options",
          value: cleanText(options || "No options"),
        }
      )
      .setTimestamp()
      .setFooter({ text: `Guild: ${interaction.guild.name}` });

    await sendLog(interaction.guild, embed);
    return;
  }

  if (interaction.isButton()) {
    const embed = new EmbedBuilder()
      .setTitle("Button Pressed")
      .setColor(0x57f287)
      .addFields(
        {
          name: "User",
          value: `${interaction.user.tag}\n\`${interaction.user.id}\``,
          inline: true,
        },
        {
          name: "Button ID",
          value: `\`${interaction.customId}\``,
          inline: true,
        },
        {
          name: "Channel",
          value: `<#${interaction.channelId}>`,
          inline: true,
        }
      )
      .setTimestamp();

    await sendLog(interaction.guild, embed);
    return;
  }

  if (interaction.isStringSelectMenu()) {
    const embed = new EmbedBuilder()
      .setTitle("Select Menu Used")
      .setColor(0xfee75c)
      .addFields(
        {
          name: "User",
          value: `${interaction.user.tag}\n\`${interaction.user.id}\``,
          inline: true,
        },
        {
          name: "Menu ID",
          value: `\`${interaction.customId}\``,
          inline: true,
        },
        {
          name: "Selected Values",
          value: cleanText(interaction.values.join(", ")),
        }
      )
      .setTimestamp();

    await sendLog(interaction.guild, embed);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild) return;
  if (message.channelId === logChannelId) return;

  // Logs visible responses/messages sent by any bot.
  if (!message.author.bot) return;

  const embed = new EmbedBuilder()
    .setTitle("Bot Message / Bot Command Result")
    .setColor(0xed4245)
    .addFields(
      {
        name: "Bot",
        value: `${message.author.tag}\n\`${message.author.id}\``,
        inline: true,
      },
      {
        name: "Channel",
        value: `<#${message.channelId}>`,
        inline: true,
      },
      {
        name: "Message ID",
        value: `\`${message.id}\``,
        inline: true,
      },
      {
        name: "Text Content",
        value: cleanText(message.content || "No text content"),
      },
      {
        name: "Embeds",
        value: String(message.embeds.length),
        inline: true,
      }
    )
    .setTimestamp(message.createdAt)
    .setFooter({ text: `Guild: ${message.guild.name}` });

  if (message.embeds.length > 0) {
    const first = message.embeds[0];

    embed.addFields(
      {
        name: "First Embed Title",
        value: cleanText(first.title || "No title"),
      },
      {
        name: "First Embed Description",
        value: cleanText(first.description || "No description"),
      }
    );

    if (first.url) {
      embed.addFields({
        name: "Embed Link",
        value: first.url,
      });
    }

    if (first.author?.name) {
      embed.addFields({
        name: "Embed Author",
        value: cleanText(first.author.name),
        inline: true,
      });
    }

    if (first.footer?.text) {
      embed.addFields({
        name: "Embed Footer",
        value: cleanText(first.footer.text),
        inline: true,
      });
    }
  }

  await sendLog(message.guild, embed);
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (!newMessage.guild) return;
  if (newMessage.channelId === logChannelId) return;
  if (!newMessage.author?.bot) return;

  const oldContent = oldMessage.content || "No text content";
  const newContent = newMessage.content || "No text content";

  const embed = new EmbedBuilder()
    .setTitle("Bot Message Edited")
    .setColor(0xfaa61a)
    .addFields(
      {
        name: "Bot",
        value: `${newMessage.author.tag}\n\`${newMessage.author.id}\``,
        inline: true,
      },
      {
        name: "Channel",
        value: `<#${newMessage.channelId}>`,
        inline: true,
      },
      {
        name: "Before",
        value: cleanText(oldContent),
      },
      {
        name: "After",
        value: cleanText(newContent),
      },
      {
        name: "Embed Count",
        value: String(newMessage.embeds.length),
        inline: true,
      }
    )
    .setTimestamp();

  await sendLog(newMessage.guild, embed);
});

client.on(Events.MessageDelete, async (message) => {
  if (!message.guild) return;
  if (message.channelId === logChannelId) return;
  if (!message.author?.bot) return;

  const embed = new EmbedBuilder()
    .setTitle("Bot Message Deleted")
    .setColor(0x992d22)
    .addFields(
      {
        name: "Bot",
        value: `${message.author.tag}\n\`${message.author.id}\``,
        inline: true,
      },
      {
        name: "Channel",
        value: `<#${message.channelId}>`,
        inline: true,
      },
      {
        name: "Text Content",
        value: cleanText(message.content || "No text content"),
      },
      {
        name: "Embed Count",
        value: String(message.embeds.length),
        inline: true,
      }
    )
    .setTimestamp();

  await sendLog(message.guild, embed);
});

client.login(token);
