import { ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { db } from "../index.js";

export class MassConfigCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "mass-config",
      description: "massively destruct the config file",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("mass-config")
        .setDescription("massively destruct the config file")
        .addStringOption((option) =>
          option.setName("object").setDescription("the object to set the entire config file to").setRequired(true)
        )
        .addBooleanOption((option) =>
          option.setName("show").setDescription("whether the reply should be shown (default: false)")
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const object = interaction.options.getString("object", true);
    const show = interaction.options.getBoolean("show") ?? false;

    if (interaction.user.id !== process.env.BOT_OWNER) {
      return interaction.reply({
        content: `only the bot owner <@${process.env.BOT_OWNER}> can use this command`,
        flags: show ? undefined : MessageFlags.Ephemeral,
      });
    }

    try {
      let oldConfig, newConfig: string;
      try {
        newConfig = JSON.stringify(object);
        oldConfig = JSON.stringify(await db.get("config"));
      } catch (error) {
        newConfig = "none/invalid";
        oldConfig = "none/invalid";
      }
      await db.set("config", JSON.parse(object));

      const embed = new EmbedBuilder()
        .setColor("Navy")
        .setAuthor({ name: "Config set" })
        .addFields(
          {
            name: "Old config",
            value: oldConfig,
            inline: true,
          },
          {
            name: "New config",
            value: newConfig,
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
