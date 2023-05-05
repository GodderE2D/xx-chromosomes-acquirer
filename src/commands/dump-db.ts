import { ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { db } from "../index.js";

export class DumpDbCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "dump-db",
      description: "shows you the entire database in json somehow",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("dump-db")
        .setDescription("shows you the entire database in json somehow")
        .addBooleanOption((option) =>
          option
            .setName("show")
            .setDescription(
              "whether the reply should be shown (default: false)"
            )
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const show = interaction.options.getBoolean("show") ?? false;

    if (interaction.user.id !== process.env.BOT_OWNER) {
      return interaction.reply({
        content: `only the bot owner <@${process.env.BOT_OWNER}> can use this command`,
        ephemeral: !show,
      });
    }

    try {
      const dump = await db.all();
      console.log(`[${new Date()}] Database dump:\n`, dump);

      const stringified = JSON.stringify(dump, null, 2);

      const embed = new EmbedBuilder()
        .setDescription(`\`\`\`json\n${stringified}\`\`\``)
        .setColor("Orange");

      return interaction.reply({
        content: `here you go (entries length: ${dump.length}; string length: ${stringified.length})`,
        embeds: [embed],
        ephemeral: !show,
      });
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: `oopsies, error: ${error}`,
        ephemeral: !show,
      });
    }
  }
}
