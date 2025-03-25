import { ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { db } from "../index.js";

export class ConfigCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "config",
      description: "config something idk",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("config")
        .setDescription("config something idk")
        .addStringOption((option) => option.setName("key").setDescription("the key to config").setRequired(true))
        .addStringOption((option) =>
          option.setName("value").setDescription("the value to set the key to").setRequired(true)
        )
        .addBooleanOption((option) =>
          option.setName("show").setDescription("whether the reply should be shown (default: false)")
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const userKey = interaction.options.getString("key", true);
    const userValue = interaction.options.getString("value", true);
    const show = interaction.options.getBoolean("show") ?? false;

    if (interaction.user.id !== process.env.BOT_OWNER) {
      return interaction.reply({
        content: `only the bot owner <@${process.env.BOT_OWNER}> can use this command`,
        flags: show ? undefined : MessageFlags.Ephemeral,
      });
    }

    if (!/^[a-zA-Z0-9:_-]+$/.test(userKey)) {
      return interaction.reply({
        content: "invalid key. must be lowercase, alphanumeric, and can contain underscores, dashes, and colons.",
        flags: show ? undefined : MessageFlags.Ephemeral,
      });
    }

    try {
      const oldResult = await db.get(`config.${userKey}`);
      if (!userValue.length) {
        await db.delete(`config.${userKey}`);
      } else {
        await db.set(`config.${userKey}`, userValue);
      }

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setAuthor({ name: "Config updated" })
        .addFields(
          {
            name: "Key",
            value: userKey,
            inline: true,
          },
          {
            name: "Old value",
            value: oldResult || "none",
            inline: true,
          },
          {
            name: "New value",
            value: userValue || "none",
            inline: true,
          }
        )
        .setFooter({
          text: "A bot restart may be needed for some changes to take effect: /restart",
        });

      return interaction.reply({ embeds: [embed], flags: show ? undefined : MessageFlags.Ephemeral });
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: `An error occurred while updating the config: ${error}`,
        flags: show ? undefined : MessageFlags.Ephemeral,
      });
    }
  }
}
