import { ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { isGuildMember } from "@sapphire/discord.js-utilities";
import { db } from "../index.js";

// const roles = {
//   eligibleRole: "1099032374798467122",
//   tempAdminRole: "1100240074639155271",
// };

export class ARCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "gibadmin",
      description: "gibs you admin for 3s, for some special needs people",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("gibadmin")
        .setDescription("gibs you admin for 3s, for some special needs people")
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.guild) {
      return interaction.reply("i can't gib you admin if we're in a dm smh");
    }

    if (!isGuildMember(interaction.member)) return;

    const roles = {
      eligibleRole: await db.get("config.gibadmin:eligibleRole"),
      tempAdminRole: await db.get("config.gibadmin:tempAdminRole"),
    };

    if (!interaction.member.roles.cache.has(roles.eligibleRole)) {
      return interaction.reply(
        `you're not a special needs person, you need the <@&${roles.eligibleRole}> role`
      );
    }

    try {
      await interaction.member.roles.add(roles.tempAdminRole);

      await interaction.reply(
        `go wild, you lose/lost <@&${roles.tempAdminRole}> <t:${Math.floor(
          (Date.now() + 3000) / 1000
        )}:R>`
      );

      await new Promise((resolve) => setTimeout(resolve, 3000));
      await interaction.member.roles.remove(roles.tempAdminRole);

      return interaction.followUp(
        "now ur back to a special needs person who probably plays bedwars 24/7"
      );
    } catch (error) {
      return interaction.reply(
        `i tried to gib you admin, but the force is against me.\nerror: ${error}`
      );
    }
  }
}
