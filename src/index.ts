import dotenv from "dotenv";
import { writeFileSync } from "fs";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import {
  GatewayDispatchEvents,
  GatewayIntentBits,
  ChannelType,
  Client,
} from "@discordjs/core";

import { think } from "./brain";

dotenv.config();

if (!process.env.DISCORD_BOT_TOKEN)
  throw new Error("Missing DISCORD_BOT_TOKEN in environment");

// Create REST and WebSocket managers directly
const rest = new REST({ version: "10" }).setToken(
  process.env.DISCORD_BOT_TOKEN
);
const ws = new WebSocketManager({
  token: process.env.DISCORD_BOT_TOKEN,
  intents:
    GatewayIntentBits.Guilds |
    GatewayIntentBits.GuildMessages |
    GatewayIntentBits.MessageContent,
  rest,
});

// Create a client to emit relevant events.
const client = new Client({ rest, ws });

// Listen for created threads.
// Each event contains an `api` prop along with the event data that allows you to interface with the Discord REST API.
client.on(GatewayDispatchEvents.ThreadCreate, async ({ data: thread, api }) => {
  // Ensure newly created and public thread
  if (thread.newly_created !== true || thread.type !== ChannelType.PublicThread)
    return;

  // Fetch parent thread and ensure it's a Discord forum
  const parent_thread: any = await api.threads.get(String(thread.parent_id));
  if (parent_thread.type !== ChannelType.GuildForum) return;

  // Get first message in thread
  const messages = await api.channels.getMessages(thread.id);
  if (messages.length <= 0) return;

  const message = messages.shift();

  console.log(`--- new thread: ${thread.name}`);
  console.log(
    `--- message: (${message?.author.username}): ${message?.content}`
  );

  if (!message?.content) return;

  const question = `${thread.name} ${message.content}`;

  // Think of an answer to the message
  const answer = await think(question);
  if (!answer) return;

  console.log(`--- answer: ${answer}`);

  // Reply to same thread
  api.channels.createMessage(thread.id, { content: answer });

  // Take action if unanswered question
  if (/(Sorry|I don't know)/i.test(answer)) {
    api.channels.createMessage(thread.id, {
      content:
        "I will notify a human. They are sometimes necessary, after all. <@207168156144238593>", // Pwntus Discord ID
    });
    writeFileSync(
      "./unanswered-questions.txt",
      `thread: ${thread.name}\nmessage: (${message?.author.username}): ${message.content}\n_______________\n`
    );
    console.log(
      "--- failed to answer, a human was notified and original question logged"
    );
  }
});

// Listen for the ready event
client.once(GatewayDispatchEvents.Ready, () => console.log("--- bot ready!"));

// Start the WebSocket connection.
ws.connect();
