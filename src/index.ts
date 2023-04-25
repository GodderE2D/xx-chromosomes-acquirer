import "dotenv/config";
import { SapphireClient } from "@sapphire/framework";

const client = new SapphireClient({ intents: 3276799 });

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag} (${client.user?.id})`);
});

client.login(process.env.TOKEN);
