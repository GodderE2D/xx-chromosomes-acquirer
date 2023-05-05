import { Listener } from "@sapphire/framework";
import { Events, type Channel } from "discord.js";
import { isTextChannel } from "@sapphire/discord.js-utilities";
import { db } from "../index.js";

export class AntiNSFWListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ChannelUpdate,
    });
  }

  public async run(oldChannel: Channel, newChannel: Channel) {
    if (!isTextChannel(oldChannel) || !isTextChannel(newChannel)) return;
    if ((await db.get("config.antinsfw:enabled")) === false) return;

    if (oldChannel.nsfw === false && newChannel.nsfw === true) {
      try {
        await newChannel.setNSFW(false);
        return newChannel.send(
          "this is a christian discord server, no nsfw channels allowed (sponsored by big god man)"
        );
      } catch (error) {
        console.error(error);
        return newChannel.send("i tried..");
      }
    }

    return;
  }
}
