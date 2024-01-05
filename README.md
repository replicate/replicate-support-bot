# Replicate support bot

A Discord bot that answers questions about [Replicate](https://replicate.com). Use this to make ChatGPT answer questions based on **your** documentation.

[Read the blog post](https://aurdal.group/blog/make-a-chatgpt-discord-bot-answer-questions-about-your-own-documentation/) for more details on how this app was built.

![Replicare](./demo.gif)

## 1. How it works

The goal is to make ChatGPT answer questions within a limited context, where the context is a relevant section of a larger documentation. To do this we use [embeddings](https://platform.openai.com/docs/guides/embeddings). In short, embeddings are tokens converted into vectors that can be used to calculate how closely related two strings are. If we split the documentation into chunks and encode them as embeddings in a vector database, we can query relevant documentation chunks later if we use the same encoding on questions. The relevant documentation chunks will then be used as context for a ChatGPT session.

## Update 5 Jan 2024

The bot is updated to use [Replicate Retriever](https://github.com/replicate/replicate-retriever). This is the retrieval step that is separated out into its own API.
