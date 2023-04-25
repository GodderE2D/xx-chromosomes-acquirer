import { ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { isMessageInstance } from "@sapphire/discord.js-utilities";
import { EmbedBuilder } from "discord.js";

export class WalkinghorseCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "walkinghorse",
      description: "checks whether the horse is walking or not",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("walkinghorse")
        .setDescription("checks whether the horse is walking or not")
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const msg = await interaction.reply({
      content: `we are currently awaiting on the horse to walk... <https://en.wikipedia.org/wiki/Schr%C3%B6dinger's_cat>`,
      fetchReply: true,
    });

    if (isMessageInstance(msg)) {
      const diff = msg.createdTimestamp - interaction.createdTimestamp;
      const ping = Math.round(this.container.client.ws.ping);

      const embed = new EmbedBuilder()
        .setDescription("A wild walkenhorst...")
        .setColor("Yellow")
        .setImage("https://media.tenor.com/rUHoKUXUX6oAAAAC/strut-dancing.gif");

      return interaction.editReply({
        content: `the horse is walking at an average time of ${diff}ms. its heartbeat is ${ping}ms.`,
        embeds: [embed],
      });
    }

    return interaction.editReply(
      "the horse is somehow not walking... wait wtf"
    );
  }
}
