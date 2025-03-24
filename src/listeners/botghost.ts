import { Listener } from "@sapphire/framework";
import { Events, type Message } from "discord.js";
import { db } from "../index.js";

export class AntiNSFWListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageCreate,
    });
  }

  public async run(message: Message) {
    if (!message.author.bot) return;
    if (message.embeds[0]?.title !== "BotGhost") return;
    if ((await db.get("config.botghost:enabled")) === "false") return;

    return message.reply("that's a cringe botghost bot. dont use botghost kids");
  }
}
