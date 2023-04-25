import { ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

export class ARCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "ar",
      description: "ar, short for american roulette or ar-15",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("ar")
        .setDescription("ar, short for american roulette or ar-15")
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const filtersEmbed = new EmbedBuilder().setDescription(
      [
        "**Filters**:",
        "- Is performed in a server (not dm or group dm)",
        "- Member is not a bot",
        "- Member must be able to be timed out by me",
        "- Member must be lower than me in hierarchy (see server settings > roles and drag my role to the top)",
      ].join("\n")
    );

    if (!interaction.guild) {
      return interaction.reply({
        content:
          "you want me to roulette on you? there's only 1 person here...",
        embeds: [filtersEmbed],
      });
    }
    const members = await interaction.guild?.members.fetch();
    const eligibleMembers = members
      .filter(
        (member) =>
          member.roles.highest.position <=
          interaction.guild?.members.me?.roles.highest.position!
      )
      .filter((member) => !member.user.bot && member.moderatable);

    if (!eligibleMembers.size) {
      return interaction.reply({
        content: "i physically have no one to exercise my rights on...",
        embeds: [filtersEmbed],
      });
    }

    const randomMember = eligibleMembers.random()!;

    try {
      await randomMember.timeout(10_000, "someone did /ar...");

      const imageEmbed = new EmbedBuilder()
        .setDescription(
          "> A well regulated Militia, being necessary to the security of a free State, the right of the people to keep and bear Arms, shall not be infringed.\n:flag_us: :flag_us: :flag_us:"
        )
        .setImage(
          "https://media.tenor.com/fklGVnlUSFQAAAAd/russian-roulette.gif"
        )
        .setColor("Yellow");

      return interaction.reply({
        content: `${randomMember.user.tag} was shot by an AR-15. Walkenhorst takes the bullet for them, and now ${randomMember.user.tag} is muted for 10s.`,
        embeds: [filtersEmbed, imageEmbed],
      });
    } catch (error) {
      return interaction.reply({
        content: `i tried to timeout ${randomMember.user.tag}, but the force is against me.\nerror: ${error}`,
        embeds: [filtersEmbed],
      });
    }
  }
}
