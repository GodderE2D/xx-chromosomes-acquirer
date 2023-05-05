import "dotenv/config";
import { SapphireClient } from "@sapphire/framework";
import { QuickDB } from "quick.db";

const client = new SapphireClient({ intents: 3276799 });
export const db = new QuickDB();

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag} (${client.user?.id})`);
});

client.login(process.env.TOKEN);
