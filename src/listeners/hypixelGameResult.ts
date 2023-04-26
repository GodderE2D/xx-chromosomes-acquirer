import { Listener } from "@sapphire/framework";
import { Client, EmbedBuilder, Events } from "discord.js";
import axios from "axios";
import type { paths } from "../types/schema.js";
import { isTextChannel } from "@sapphire/discord.js-utilities";

const uuids: string[] = [
  "28b0a9f965c1450babebda9bf3d5830a",
  "085ae374d37049b6adf58eae0102a572",
];
const announcementChannelId = "1100597109692051627";

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
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: Events.ClientReady,
    });
  }

  public async run(client: Client) {
    if (!process.env.HYPIXEL_API_KEY)
      return console.warn(
        "No Hypixel API key found. Hypixel game results will not be fetched."
      );

    const cache = new Map<string, { totalWins: number; totalLosses: number }>();

    setInterval(async () => {
      for (const uuid of uuids) {
        try {
          const { data } = await axios.get(
            `https://api.hypixel.net/player?uuid=${encodeURIComponent(uuid)}`,
            {
              headers: {
                "API-Key": process.env.HYPIXEL_API_KEY,
              },
            }
          );

          const {
            player,
          }: paths["/player"]["get"]["responses"]["200"]["content"]["application/json"] =
            data;

          // @ts-expect-error untyped properties
          const wins = player?.stats?.Bedwars?.wins_bedwars;
          // @ts-expect-error untyped properties
          const losses = player?.stats?.Bedwars?.losses_bedwars;
          const username = player?.displayname;

          console.log(wins, losses);
          console.log(cache);

          if (cache.has(uuid)) {
            const oldWins = cache.get(uuid)!.totalWins;
            const oldLosses = cache.get(uuid)!.totalLosses;

            cache.set(uuid, { totalWins: wins, totalLosses: losses });

            if (wins > oldWins || losses > oldLosses) {
              try {
                const { data } = await axios.get(
                  `https://api.hypixel.net/recentgames?uuid=${encodeURIComponent(
                    uuid
                  )}`,
                  {
                    headers: {
                      "API-Key": process.env.HYPIXEL_API_KEY,
                    },
                  }
                );

                const {
                  games,
                }: paths["/recentgames"]["get"]["responses"]["200"]["content"]["application/json"] =
                  data;
                const { mode, map, ended } = games?.filter(
                  (game) => game.gameType === "BEDWARS"
                )[0]!;

                const embed = new EmbedBuilder()
                  .setDescription(
                    `**${username}** ${
                      wins > oldWins ? "won" : "lost"
                    } a Hypixel Bedwars game of **${
                      gamemodes[mode as keyof typeof gamemodes]
                    }** on **${map}** <t:${Math.floor(ended! / 1000)}:R>`
                  )
                  .setColor(wins > oldWins ? "Green" : "Red");

                const channel = await client.channels.fetch(
                  announcementChannelId
                );

                if (!isTextChannel(channel)) {
                  console.error("Channel is not a text channel.");
                  continue;
                }

                await channel.send({ embeds: [embed] });
              } catch (error) {
                console.error(error);
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
