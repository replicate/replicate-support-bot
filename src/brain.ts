import dotenv from "dotenv";
import fetch from "node-fetch";
import { Configuration, OpenAIApi } from "openai";
import GPT3Tokenizer from "gpt3-tokenizer";

dotenv.config();

if (!process.env.OPENAI_API_KEY)
  throw new Error("Missing OPENAI_API_KEY in environment");

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

const tokenizer = new GPT3Tokenizer({ type: "gpt3" });

const CONTEXT = {
  system:
    'You are a very enthusiastic Replicate representative who loves to help people! Given the following sections from the Replicate documentation, answer the question using only that information. If you are unsure and the answer is not explicitly written in the documentation, say "Sorry, I don\'t know how to help with that.". Do not answer with something that is not written in the documentation.',
  user: "Context sections:\nYou can use Replicate to run machine learning models in the cloud from your own code, without having to set up any servers. Our community has published hundreds of open-source models that you can run, or you can run your own models.\n\nQuestion:\nwhat is replicate?",
  assistant:
    "Replicate lets you run machine learning models with a cloud API, without having to understand the intricacies of machine learning or manage your own infrastructure. You can run open-source models that other people have published, or package and publish your own models. Those models can be public or private.",
};

export const think = async (question: string) => {
  try {
    const response = await fetch(
      "https://replicate-retriever.vercel.app/api/retrieve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: question,
          content_length: 1000,
          limit: 20,
        }),
      }
    );
    const documents: { title: string; url: string; content: string }[] =
      await response.json();

    // Create deduplicated list of sources
    const mapObj = new Map();
    documents.forEach(({ title, url }) => {
      mapObj.set(title, { title, url });
    });
    const sources = [...mapObj.values()];

    // Create context
    let tokenCount = 0;
    let contextText = "";

    // Concat matched documents
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      const content = document.content;
      const encoded = tokenizer.encode(content);
      const prevTokenCount = tokenCount;
      tokenCount += encoded.text.length;

      // Limit context tokens
      if (tokenCount > 4096) {
        console.log(`--- brain: previous token count (${prevTokenCount})`);
        break;
      }

      contextText += `${content.trim()}\n---\n`;
    }

    console.log(
      `--- brain: ctx docs (${documents.length}), token count (${tokenCount})`
    );

    // Generate ChatGPT messages context
    const messages: any[] = [
      {
        role: "system",
        content: CONTEXT.system,
      },
      {
        role: "user",
        content: CONTEXT.user,
      },
      {
        role: "assistant",
        content: CONTEXT.assistant,
      },
      {
        role: "user",
        content: `Context sections:\n${contextText}\n\nQuestion:\n${question}`,
      },
    ];

    const { data } = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      n: 1,
    });

    if (data.choices.length <= 0) throw new Error("No response from LLM");

    const answer = data.choices[0].message?.content || null;

    return { answer, sources };
  } catch (e: any) {
    console.log(`--- brain think error: ${e.message}`);
    console.log(e);
    return { answer: null, sources: null };
  }
};
