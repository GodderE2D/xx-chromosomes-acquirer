import { Listener } from "@sapphire/framework";
import { Collection, Events, type Message } from "discord.js";

const channelId = "1099153687345102919";

export class AntiNSFWListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageCreate,
    });
  }

  public async run(message: Message) {
    if (message.author.bot) return;
    if (message.channel.id !== channelId) return;
    const previousMsgs: Collection<string, Message> =
      await message.channel.messages.fetch();
    const previousMsg = previousMsgs
      .filter((msg) => !msg.author.bot && msg.id !== message.id)
      .first();

    if (!previousMsg) return;

    if (previousMsg.author.id === message.author.id) {
      await message.delete();
      const reply = await message.channel.send("no double counts smh");
      setTimeout(() => reply.delete(), 5000);
      return;
    }

    if (previousMsg.editedTimestamp) return;
    const previousMsgCount = parseInt(previousMsg.content);
    if (!previousMsgCount) return;

    if (previousMsgCount + 1 !== parseInt(message.content)) {
      await message.delete();
      const reply = await message.channel.send("bro cant count :skull:");
      setTimeout(() => reply.delete(), 5000);
      return;
    }
  }
}
