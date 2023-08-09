require("dotenv").config();
const cheerio = require("cheerio");
const { Configuration, OpenAIApi } = require("openai");
const { createClient } = require("@supabase/supabase-js");

// Embeddings document maximum size
const DOCUMENT_SIZE = 1100;

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const getDocuments = async (urls) => {
  const documents = [];
  for (const url of urls) {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const articleText = $("body").text();

    let start = 0;
    while (start < articleText.length) {
      const end = start + DOCUMENT_SIZE;
      const chunk = articleText.slice(start, end);
      documents.push({ url, body: chunk });
      start = end;
    }
  }
  return documents;
};

const main = async () => {
  try {
    // Add documentation URLs to be fetched here
    const urls = [
      "https://replicate.com/home",
      "https://replicate.com/docs",
      "https://replicate.com/docs/get-started/nodejs",
      "https://replicate.com/docs/get-started/python",
      "https://replicate.com/docs/get-started/nextjs",
      "https://replicate.com/docs/get-started/swiftui",
      "https://replicate.com/docs/get-started/discord-bot",
      "https://hexdocs.pm/replicate/readme.html",
      "https://replicate.com/docs/guides/push-a-model",
      "https://replicate.com/docs/how-does-replicate-work#private-models",
      "https://replicate.com/docs/guides/fine-tune-a-language-model",
      "https://replicate.com/docs/guides/fine-tune-an-image-model",
      "https://replicate.com/docs/guides/get-a-gpu-machine",
      "https://replicate.com/docs/guides/push-stable-diffusion",
      "https://raw.githubusercontent.com/replicate/setup-cog/main/README.md",
      "https://replicate.com/docs/how-does-replicate-work",
      "https://replicate.com/showcase",
      "https://replicate.com/docs/reference/client-libraries",
      "https://replicate.com/docs/reference/http",
      "https://replicate.com/about",
      "https://replicate.com/pricing",
      "https://replicate.com/blog/hello-world",
      "https://replicate.com/blog/constraining-clipdraw",
      "https://replicate.com/blog/model-docs",
      "https://replicate.com/blog/exploring-text-to-image-models",
      "https://replicate.com/blog/daily-news",
      "https://replicate.com/blog/grab-hundreds-of-images-with-clip-and-laion",
      "https://replicate.com/blog/uncanny-spaces",
      "https://replicate.com/blog/build-a-robot-artist-for-your-discord-server-with-stable-diffusion",
      "https://replicate.com/blog/run-stable-diffusion-with-an-api",
      "https://replicate.com/blog/run-stable-diffusion-on-m1-mac",
      "https://replicate.com/blog/dreambooth-api",
      "https://replicate.com/blog/lora-faster-fine-tuning-of-stable-diffusion",
      "https://replicate.com/blog/machine-learning-needs-better-tools",
      "https://replicate.com/blog/replicate-alpaca",
      "https://replicate.com/blog/fine-tune-llama-to-speak-like-homer-simpson",
      "https://replicate.com/blog/llama-roundup",
      "https://replicate.com/blog/fine-tune-alpaca-with-lora",
      "https://replicate.com/blog/language-models",
      "https://replicate.com/blog/autocog",
      "https://replicate.com/blog/language-model-roundup",
      "https://replicate.com/blog/new-status-page",
      "https://replicate.com/blog/turn-your-llm-into-a-poet",
      "https://replicate.com/blog/llama-2-roundup",
      "https://replicate.com/blog/fine-tune-llama-2",
      "https://replicate.com/blog/run-llama-locally",
      "https://replicate.com/blog/run-sdxl-with-an-api",
      "https://replicate.com/blog/run-llama-2-with-an-api",
      "https://replicate.com/blog/all-the-llamas",
      "https://replicate.com/blog/fine-tune-sdxl",
      "https://replicate.com/changelog",
    ];
    const documents = await getDocuments(urls);

    for (const { url, body } of documents) {
      // OpenAI recommends replacing newlines with spaces for best results
      const input = body.replace(/\n/g, " ");

      console.log("\nDocument length: \n", body.length);
      console.log("\nURL: \n", url);

      const embeddingResponse = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input,
      });

      const [{ embedding }] = embeddingResponse.data.data;

      await supabase.from("documents").insert({
        content: input,
        embedding,
        url,
      });
    }
  } catch (e) {
    console.error(e.message);
  }
};

main();
