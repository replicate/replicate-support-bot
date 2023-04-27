import dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";
import { createClient } from "@supabase/supabase-js";
import GPT3Tokenizer from "gpt3-tokenizer";

dotenv.config();

if (!process.env.OPENAI_API_KEY)
  throw new Error("Missing OPENAI_API_KEY in environment");
if (!process.env.SUPABASE_URL)
  throw new Error("Missing SUPABASE_URL in environment");
if (!process.env.SUPABASE_KEY)
  throw new Error("Missing SUPABASE_KEY in environment");

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
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
    // OpenAI recommends replacing newlines with spaces for best results
    const input = question.replace(/\n/g, " ");

    // Generate a one-time embedding for the question itself
    const embeddingResponse = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input,
    });

    const [{ embedding }] = embeddingResponse.data.data;

    // Match embeddings with vector database
    const { error, data: documents } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      similarity_threshold: 0.5, // configurable
      match_count: 10,
    });

    if (error) throw new Error(error.message);

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
      `--- brain: ctx docs (${
        documents.length
      }), ctx docs scores (${documents.map(
        (i: any) => i.similarity
      )}, token count (${tokenCount})`
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

    if (data.choices.length <= 0) return null;

    return data.choices[0].message?.content || null;
  } catch (e: any) {
    console.log(`--- brain think error: ${e.message}`);
    console.log(e);
  }
};
