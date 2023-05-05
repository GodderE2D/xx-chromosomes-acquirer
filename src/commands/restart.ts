import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

export class RestartCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "restart",
      description: "restarts the bot (if it runs in pm2 ofc)",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("restart")
        .setDescription("restarts the bot (if it runs in pm2 ofc)")
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.user.id !== process.env.BOT_OWNER) {
      return interaction.reply({
        content: `only the bot owner <@${process.env.BOT_OWNER}> can use this command`,
      });
    }

    try {
      await interaction.reply("restarting... (see you on the other side!)");
    } catch (error) {
      console.error(error);
    } finally {
      process.exit(0);
    }
  }
}
