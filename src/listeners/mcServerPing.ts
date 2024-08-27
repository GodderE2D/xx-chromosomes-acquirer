import { Listener } from "@sapphire/framework";
import {
  AttachmentBuilder,
  ChannelType,
  type Client,
  Collection,
  type ColorResolvable,
  EmbedBuilder,
  Events,
  time,
} from "discord.js";
import mc from "minecraftstatuspinger";
import { z } from "zod";
import { db } from "../index.js";

export class MCServerPingListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ClientReady,
    });
  }

  public async run(client: Client) {
    if ((await db.get("config.mcServerPing:enabled")) === "false") return;

    const interval = ((await db.get("config.mcServerPing:interval")) as string | undefined) ?? "10000";
    const servers = JSON.parse(
      ((await db.get("config.mcServerPing:servers")) as string | undefined) ?? "[]"
    ) as string[];
    const protocolVersion = ((await db.get("config.mcServerPing:protocolVersion")) as string | undefined) ?? "767";

    mc.setDnsServers(["1.1.1.1", "8.8.8.8"]);

    const cache = new Collection<string, { online: boolean; players: { name: string; id: string }[] }>();

    // https://github.com/woodendoors7/MinecraftStatusPinger/wiki/Valid-server-response-examples
    const statusSchema = z.object({
      version: z.object({ name: z.string() }),
      players: z.object({
        max: z.number(),
        online: z.number(),
        sample: z.array(z.object({ name: z.string(), id: z.string() })).optional(),
      }),
      favicon: z.string().optional(),
    });

    setInterval(async () => {
      for (const [index, server] of servers.entries()) {
        // Each array index in config.mcServerPing:servers corresponds to the array index in config.mcServerPing:channelIds
        const channelIds = JSON.parse(
          ((await db.get("config.mcServerPing:channelIds")) as string | undefined) ?? "[]"
        ) as string[];

        const channel = client.channels.cache.get(channelIds[index] ?? "");
        if (channel?.type !== ChannelType.GuildText && channel?.type !== ChannelType.GuildAnnouncement) continue;

        const sendEmbed = async (content: string, iconURL: string, color: ColorResolvable) => {
          const embed = new EmbedBuilder().setAuthor({ name: content, iconURL }).setColor(color);

          return await channel.send({ embeds: [embed] });
        };

        const [host, port] = server.split(":");

        try {
          const lookup = await mc.lookup({
            host,
            port: parseInt(port ?? "25565"),
            protocolVersion: parseInt(protocolVersion),
          });

          const status = statusSchema.parse(lookup.status);

          if (!status.players.sample?.length) status.players.sample = [];

          const serverCache = cache.get(server) ?? cache.set(server, { online: false, players: [] }).get(server)!;

          let sentMessage = false;

          if (!serverCache.online) {
            await channel.send("✅ **Server is online**");
            sentMessage = true;
          }

          for (const playerName of new Set([
            ...serverCache.players.map((p) => p.name),
            ...status.players.sample.map((p) => p.name),
          ])) {
            const uuid =
              status.players.sample.find((p) => p.name === playerName)?.id ??
              serverCache.players.find((p) => p.name === playerName)?.id;

            if (!status.players.sample.some((p) => p.name === playerName)) {
              await sendEmbed(`${playerName} left the server`, `https://crafthead.net/avatar/${uuid}`, "Red");
              sentMessage = true;
            } else if (!serverCache.players.some((p) => p.name === playerName)) {
              await sendEmbed(`${playerName} joined the server`, `https://crafthead.net/avatar/${uuid}`, "Green");
              sentMessage = true;
            }
          }

          cache.set(server, { online: true, players: status.players.sample });

          const formattedPlayerList = status.players.sample.length
            ? `\n- ${status.players.sample.map((p) => `[${p.name}](https://namemc.com/profile/${p.id})`).join("\n- ")}`
            : "";

          const buffer = status.favicon && Buffer.from(status.favicon.split(",")[1], "base64");

          const embed = new EmbedBuilder()
            .setAuthor({ name: "Player List", iconURL: buffer ? `attachment://favicon.png` : undefined })
            .setDescription(
              `**${status.players.online}/${status.players.max}** players online${formattedPlayerList}\n\nLast pinged ${time(new Date(), "R")}.`
            )
            .setFooter({
              text: `${server} • Interval: ${Math.ceil(parseInt(interval) / 1000)}s • Latency: ${lookup.latency}ms`,
            });

          const messages = await channel.messages.fetch();
          const playerListMsgs = messages.filter(
            (msg) => msg?.editable && msg?.embeds[0]?.footer?.text.startsWith(server)
          );

          if (playerListMsgs.first() && !sentMessage) {
            await playerListMsgs.first()!.edit({
              embeds: [embed],
              files: buffer ? [new AttachmentBuilder(buffer, { name: "favicon.png" })] : [],
            });
          } else {
            await channel.send({
              embeds: [embed],
              files: buffer ? [new AttachmentBuilder(buffer, { name: "favicon.png" })] : [],
            });

            await channel.bulkDelete(playerListMsgs);
          }
        } catch (error) {
          console.error(error);

          if (cache.get(server)?.online) await channel.send("❌ **Server is offline**");
          cache.set(server, { online: false, players: [] });

          continue;
        }
      }
    }, parseInt(interval));
  }
}
