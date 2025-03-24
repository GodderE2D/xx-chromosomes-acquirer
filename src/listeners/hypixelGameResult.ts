import { Listener } from "@sapphire/framework";
import { Client, EmbedBuilder, Events } from "discord.js";
import axios from "axios";
import type { paths } from "../types/schema.js";
import { isTextChannel } from "@sapphire/discord.js-utilities";
import { db } from "../index.js";

// const uuids: string[] = [
//   "28b0a9f965c1450babebda9bf3d5830a",
//   "085ae374d37049b6adf58eae0102a572",
//   "16999b06c26546588f0e9ab002a3a7b9",
// ];
// const announcementChannelId = "1100597109692051627";

// Note: Some other Dream gamemodes are not added here.
const gamemodes = {
  BEDWARS_EIGHT_ONE: "Solos",
  BEDWARS_EIGHT_TWO: "Duos",
  BEDWARS_FOUR_THREE: "Threes",
  BEDWARS_FOUR_FOUR: "Fours",
  BEDWARS_TWO_FOUR: "4v4",
  BEDWARS_EIGHT_TWO_VOIDLESS: "Duos Voidless",
  BEDWARS_FOUR_FOUR_VOIDLESS: "Fours Voidless",
  BEDWARS_CASTLE: "Castle",
};

export class HypixelGameResultListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: Events.ClientReady,
    });
  }

  public async run(client: Client) {
    if (!process.env.HYPIXEL_API_KEY) {
      return console.warn("No Hypixel API key found. Hypixel game results will not be fetched.");
    }

    if ((await db.get("config.hypixelGameResult:enabled")) === false) return;

    const dbUuids = await db.get("config.hypixelGameResult:uuids");
    if (dbUuids?.length === 0) return;
    const uuids = JSON.parse(dbUuids);

    const announcementChannelId = await db.get("config.hypixelGameResult:announcementChannelId");

    const cache = new Map<string, { totalWins: number; totalLosses: number }>();

    setInterval(async () => {
      for (const uuid of uuids) {
        try {
          const { data } = await axios.get(`https://api.hypixel.net/player?uuid=${encodeURIComponent(uuid)}`, {
            headers: {
              "API-Key": process.env.HYPIXEL_API_KEY,
            },
          });

          const { player }: paths["/player"]["get"]["responses"]["200"]["content"]["application/json"] = data;

          // @ts-expect-error untyped properties
          const wins = player?.stats?.Bedwars?.wins_bedwars;
          // @ts-expect-error untyped properties
          const losses = player?.stats?.Bedwars?.losses_bedwars;
          const username = player?.displayname;

          if (cache.has(uuid)) {
            const oldWins = cache.get(uuid)!.totalWins;
            const oldLosses = cache.get(uuid)!.totalLosses;

            cache.set(uuid, { totalWins: wins, totalLosses: losses });

            if (wins > oldWins || losses > oldLosses) {
              try {
                const { data } = await axios.get(
                  `https://api.hypixel.net/recentgames?uuid=${encodeURIComponent(uuid)}`,
                  {
                    headers: {
                      "API-Key": process.env.HYPIXEL_API_KEY,
                    },
                  }
                );

                const { games }: paths["/recentgames"]["get"]["responses"]["200"]["content"]["application/json"] = data;
                const { mode, map, ended, date } = games?.filter((game) => game.gameType === "BEDWARS")[0]!;

                const embed = new EmbedBuilder()
                  .setDescription(
                    `**${username}** ${wins > oldWins ? "won" : "lost"} a Hypixel Bedwars game of **${
                      gamemodes[mode as keyof typeof gamemodes]
                    }** on **${map}** which ${ended ? "ended" : "started"} <t:${Math.floor((ended ?? date!) / 1000)}:R>`
                  )
                  .setColor(wins > oldWins ? "Green" : "Red");

                const channel = await client.channels.fetch(announcementChannelId);

                if (!isTextChannel(channel)) {
                  console.error("Channel is not a text channel.");
                  continue;
                }

                await channel.send({ embeds: [embed] });
              } catch (error) {
                console.error(error);
                const embed = new EmbedBuilder()
                  .setDescription(
                    `**${username}** ${wins > oldWins ? "won" : "lost"} a Hypixel Bedwars game around <t:${Math.floor(
                      Date.now() / 1000
                    )}:R>`
                  )
                  .setColor(wins > oldWins ? "Green" : "Red")
                  .setFooter({
                    text: [
                      "Could not fetch game data.",
                      "This usually means that the player made their game tracking API private.",
                    ].join("\n"),
                  });

                const channel = await client.channels.fetch(announcementChannelId);

                if (!isTextChannel(channel)) {
                  console.error("Channel is not a text channel.");
                  continue;
                }

                await channel.send({ embeds: [embed] });
              }
            }
          } else {
            cache.set(uuid, { totalWins: wins, totalLosses: losses });
            continue;
          }
        } catch (error) {
          console.error(error);
          continue;
        }
      }
    }, 60_000);
  }
}
