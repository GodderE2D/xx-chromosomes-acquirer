import { ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { isGuildMember } from "@sapphire/discord.js-utilities";
import { EmbedBuilder } from "discord.js";

export class RestartCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "steal-pfp",
      description: "steal the profile picture from a user and impersonate them",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("steal-pfp")
        .setDescription(
          "steal the profile picture from a user and impersonate them"
        )
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("the user to steal the pfp from")
            .setRequired(true)
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.user.id !== process.env.BOT_OWNER) {
      return interaction.reply({
        content: `only the bot owner <@${process.env.BOT_OWNER}> can use this command`,
      });
    }

    const member = interaction.options.getMember("user");

    try {
      if (!isGuildMember(member)) return;
      const avatarURL = member.displayAvatarURL({
        extension: "png",
        forceStatic: true,
        size: 512,
      });

      await interaction.client.user.setAvatar(avatarURL);

      const embed = new EmbedBuilder()
        .setDescription("i'm him")
        .setThumbnail(avatarURL)
        .setColor("LuminousVividPink");

      return interaction.reply({
        content: `wow, thanks <@${member.id}>`,
        embeds: [embed],
      });
    } catch (error) {
      console.error(error);
      return interaction.reply(`something went wrong... ${error}`);
    }
  }
}
