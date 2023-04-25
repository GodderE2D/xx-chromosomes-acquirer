import { Listener } from "@sapphire/framework";
import { Events, type Channel, type Snowflake } from "discord.js";
import { isTextChannel } from "@sapphire/discord.js-utilities";

const antiNSFWChannelId: Snowflake = "1100119414856224798";

export class AntiNSFWListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ChannelUpdate,
    });
  }

  public async run(oldChannel: Channel, newChannel: Channel) {
    if (!isTextChannel(oldChannel) || !isTextChannel(newChannel)) return;
    if (newChannel.id !== antiNSFWChannelId) return;

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
