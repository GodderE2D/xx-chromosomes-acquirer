import { Listener } from "@sapphire/framework";
import { Events, type Message } from "discord.js";

export class AntiNSFWListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageCreate,
    });
  }

  public async run(message: Message) {
    if (!message.author.bot) return;
    if (message.embeds[0].title !== "BotGhost") return;
    return message.reply(
      "that's a cringe botghost bot. dont use botghost kids"
    );
  }
}
