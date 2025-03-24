import { Listener } from "@sapphire/framework";
import { Client, EmbedBuilder, Events } from "discord.js";
import axios from "axios";
import { isTextChannel } from "@sapphire/discord.js-utilities";
import { db } from "../index.js";
import { z } from "zod";

const events = {
  soloShowdown: "Solo Showdown",
  duoShowdown: "Duo Showdown",
  heist: "Heist",
  bounty: "Bounty",
  siege: "Siege",
  gemGrab: "Gem Grab",
  brawlBall: "Brawl Ball",
  bigGame: "Big Game",
  bossFight: "Boss Fight",
  roboRumble: "Robo Rumble",
  takedown: "Takedown",
  loneStar: "Lone Star",
  presentPlunder: "Present Plunder",
  hotZone: "Hot Zone",
  superCityRampage: "Super City Rampage",
  knockout: "Knockout",
  volleyBrawl: "Volley Brawl",
  basketBrawl: "Basket Brawl",
  holdTheTrophy: "Hold The Trophy",
  trophyThieves: "Trophy Thieves",
  duels: "Duels",
  wipeout: "Wipeout",
  payload: "Payload",
  botDrop: "Bot Drop",
  hunters: "Hunters",
  lastStand: "Last Stand",
  snowtelThieves: "Snowtel Thieves",
  pumpkinPlunder: "Pumpkin Plunder",
  trophyEscape: "Trophy Escape",
  wipeout5V5: "Wipeout 5v5",
  knockout5V5: "Knockout 5v5",
  gemGrab5V5: "Gem Grab 5v5",
  brawlBall5V5: "Brawl Ball 5v5",
  godzillaCitySmash: "Godzilla City Smash",
  paintBrawl: "Paint Brawl",
  trioShowdown: "Trio Showdown",
  zombiePlunder: "Zombie Plunder",
  jellyfishing: "Jellyfishing",
  unknown: "Unknown",
};

const gameTypes = {
  ranked: "",
  soloRanked: "Ranked - ",
  friendly: "Friendly Game - ",
  challenge: "Special Challenge - ",
};

const rankedRanks = [
  "Bronze I",
  "Bronze II",
  "Bronze III",
  "Silver I",
  "Silver II",
  "Silver III",
  "Gold I",
  "Gold II",
  "Gold III",
  "Diamond I",
  "Diamond II",
  "Diamond III",
  "Mythic I",
  "Mythic II",
  "Mythic III",
  "Legendary I",
  "Legendary II",
  "Legendary III",
  "Master I",
  "Master II",
  "Master III",
  "Pro",
];

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes ? `${minutes}m` : ""}${remainingSeconds ? ` ${remainingSeconds}s` : ""}`;
}

export class BrawlStarsGameResultListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: Events.ClientReady,
    });
  }

  public async run(client: Client) {
    if (!process.env.BRAWL_STARS_API_KEY) {
      return console.warn("No Brawl Stars API key found. Brawl Stars game results will not be fetched.");
    }

    if ((await db.get("config.brawlStarsGameResult:enabled")) === false) return;

    const dbTags = await db.get("config.brawlStarsGameResult:tags");
    if (dbTags?.length === 0) return;
    const tags = JSON.parse(dbTags || "[]");

    const announcementChannelId = await db.get("config.brawlStarsGameResult:announcementChannelId");

    const cache = new Map<string, Date>();

    setInterval(async () => {
      for (const tag of tags) {
        try {
          const { data: playerData } = await axios.get(
            `https://api.brawlstars.com/v1/players/${encodeURIComponent(tag)}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.BRAWL_STARS_API_KEY}`,
              },
            }
          );

          const name = `${playerData.name}` || tag;

          const { data: battleLogData } = await axios.get(
            `https://api.brawlstars.com/v1/players/${encodeURIComponent(tag)}/battlelog`,
            {
              headers: {
                Authorization: `Bearer ${process.env.BRAWL_STARS_API_KEY}`,
              },
            }
          );

          const schema = z.object({
            items: z.array(
              z.object({
                battleTime: z.string(),
                event: z.object({
                  mode: z.string(),
                  map: z.string(),
                }),
                battle: z.object({
                  type: z.string(),
                  result: z.string().optional(),
                  rank: z.number().optional(),
                  duration: z.number().optional(),
                  trophyChange: z.number().optional(),
                  starPlayer: z
                    .object({
                      tag: z.string(),
                    })
                    .optional(),
                  teams: z
                    .array(
                      z.array(
                        z.object({
                          tag: z.string(),
                          name: z.string(),
                          brawler: z.object({
                            name: z.string(),
                            power: z.number(),
                            trophies: z.number(),
                          }),
                        })
                      )
                    )
                    .optional(),
                  players: z
                    .array(
                      z.object({
                        tag: z.string(),
                        name: z.string(),
                        brawler: z.object({
                          name: z.string(),
                          power: z.number(),
                          trophies: z.number(),
                        }),
                      })
                    )
                    .optional(),
                }),
              })
            ),
          });

          const parsed = schema.safeParse(battleLogData);

          if (!parsed.success) {
            console.error("Brawl Stars game result parsing error:", parsed.error.errors);
            continue;
          }

          function getDate(dateStr: string) {
            return new Date(
              dateStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z/, "$1-$2-$3T$4:$5:$6.$7Z")
            );
          }

          for (const { battleTime, event, battle } of parsed.data.items) {
            if ((cache.get(tag)?.getTime() ?? 0) >= getDate(battleTime).getTime()) continue;
            if (getDate(battleTime).getTime() <= Date.now() - 300_000) continue;

            cache.set(tag, getDate(battleTime));

            const ownTeam =
              battle.teams?.find((team) => team.some((player) => player.tag === tag)) ??
              battle.players ??
              battle.teams?.[0];
            const opponentTeam =
              battle.teams?.find((team) => team.every((player) => player.tag !== tag)) ?? battle.teams?.[1];

            const embed = new EmbedBuilder()
              .setDescription(
                `**${name}** ${
                  battle.rank
                    ? `placed #${battle.rank}`
                    : battle.result === "victory"
                    ? "won"
                    : battle.result === "defeat"
                    ? "lost"
                    : "drew"
                } ${battle.trophyChange ? `(${battle.trophyChange > 0 ? "+" : ""}${battle.trophyChange})` : ""}${
                  battle.rank ? " in" : ""
                } a Brawl Stars game of **${gameTypes[battle.type as keyof typeof gameTypes] ?? battle.type}${
                  events[event.mode as keyof typeof events] ?? event.mode
                }** on **${event.map}** <t:${Math.floor(getDate(battleTime).getTime() / 1000)}:R>`
              )
              .setColor(battle.result === "victory" ? "Green" : battle.result === "defeat" ? "Red" : "Blue")
              .addFields(
                [ownTeam, opponentTeam]
                  .filter(Boolean)
                  .map((team, i) => ({
                    name: battle.players
                      ? "Players"
                      : battle.result === "draw"
                      ? `[D] Team ${i + 1}`
                      : (team!.some(({ tag: t }) => t === tag) && battle.result === "victory") ||
                        (team!.every(({ tag: t }) => t !== tag) && battle.result === "defeat")
                      ? "[W] Team 1"
                      : "[L] Team 2",
                    value: team!
                      .map(
                        ({ tag: teamPlayerTag, name, brawler }) =>
                          `[\`${name}\`](https://brawlify.com/stats/profile/${tag.slice(1)}) - **${brawler.name}**${
                            brawler.power ? ` (${brawler.power})` : ""
                          }${
                            battle.type === "soloRanked"
                              ? ` \`${rankedRanks[brawler.trophies - 1]}\``
                              : brawler.trophies !== 0
                              ? ` \`🏆 ${brawler.trophies}\``
                              : ""
                          }${
                            battle.starPlayer?.tag === teamPlayerTag && tag === teamPlayerTag
                              ? " ⭐ 💙"
                              : battle.starPlayer?.tag === teamPlayerTag
                              ? " ⭐"
                              : tag === teamPlayerTag
                              ? " 💙"
                              : ""
                          }`
                      )
                      .join("\n"),
                  }))
                  .sort((a) => (a.name.includes("Team 1") ? -1 : 1))
              )
              .setFooter({ text: `${tag}${battle.duration ? ` • Duration: ${formatTime(battle.duration)}` : ""}` });

            const channel = await client.channels.fetch(announcementChannelId);

            if (!isTextChannel(channel)) {
              console.error("Channel is not a text channel.");
              continue;
            }

            await channel.send({ embeds: [embed] });
          }
        } catch (error) {
          console.error(error);
          continue;
        }
      }
    }, 5_000);
  }
}
