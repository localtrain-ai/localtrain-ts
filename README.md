<div align="center">

# localtrain.ai SDK 🤖

[![Build Pipeline](https://img.shields.io/github/actions/workflow/status/localtrain-ai/sdk/build.yml?branch=main&label=Build%20Pipeline)](https://github.com/localtrain-ai/sdk/actions/workflows/build.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE) [![Discord](https://img.shields.io/discord/123456789012345678?label=Join%20Us%20on%20Discord&logo=discord)](https://discord.com/invite/example)

</div>

***

Welcome to the **localtrain.ai SDK**!

A powerful TypeScript toolkit designed to help you seamlessly build AI-powered agents using any LLMs on runtimes like **Node.js**.

Explore the SDK to integrate AI into your applications effortlessly and scale your capabilities!

👉 **Resources**:
- [Documentation]()

---

## 🚀 Getting Started

Before you dive in, make sure you have **Node.js** installed on your machine.

### Installation

First, install the **Core Package** of localtrain.ai:

#### Using npm:
```bash
npm install @localtrain-ai/core
```
Or with yarn:
```bash
yarn add @localtrain-ai/core
```
Now, you're ready to start building amazing AI-powered solutions! 💡
## 🎯 Features of the SDK Core

The **localtrain.ai SDK core** supports the following integrations:

- **LLMs**:
    - [OpenAI](https://openai.com/)
    - [Anthropic](https://www.anthropic.com/)

- **File Handling**:
    - Local File Reader and Writer

- **Repository Management**:
    - [BitBucket](https://bitbucket.org/)

- **Scraping**:
    - Contextual Scraper

You can pick and integrate only the features you need!

---

## 📚 Usage Guide

### Example: Building an AI Agent with the SDK Core

Let’s walk through creating a **Customer Feedback Analyzer Agent** step by step:

---

### Step 1: Initialize the SDK

Start by importing the required components and initializing the **localtrain.ai SDK**:

```typescript
import { LocalTrain, Agent, ContextManager, IAgent } from '@localtrain-ai/core';
import { Openai } from '@localtrain-ai/llm/openai';

async function main() {
    // Initialize the SDK
    LocalTrain.initialize(); 
}
```

👉 What’s happening here?

The `LocalTrain.initialize()` sets up the SDK, making it ready to use.

***

### Step 2: Attach Providers to the Registry

Add the necessary providers (e.g., OpenAI) for your agent to use:

```typescript
import { LocalTrain, Agent, ContextManager, IAgent } from '@localtrain-ai/core';
import { Openai } from '@localtrain-ai/llm/openai';

async function main() {
    // Initialize the SDK
    LocalTrain.initialize();
    
    // Attach providers to the provider registry
    LocalTrain.useProviders(
        // Add OpenAI as a provider
        new Openai({
            apiKey: process.env.OPENAI_API_KEY // Pass your OpenAI API Key
        }),
        // You can add more providers here, separated by commas
    );
}
```
**👉 What’s happening here?**

The `LocalTrain.useProviders()` function registers the providers, allowing your agent to leverage their services (e.g., OpenAI for LLM functionalities).

***

### Step 3: Create and Configure the Agent
Define an agent with its configuration and purpose:
```typescript
    // Create a new agent instance
const feedbackAgent = new Agent({
    contextManager: new ContextManager().setValue("appId", "feedback-analyzer"),
});

// Define the agent details
const agentDetails: IAgent = {
    name: "Customer Feedback Analyzer",
    description: "Analyzes customer feedback and provides insights.",
    appId: "feedback-agent-id",
    inputs: [
        {
            name: 'feedback',
            title: 'Customer Feedback Input',
            type: 'Text',
            options: [],
        }
    ],
    behaviours: [
        {
            behaviourId: 'sentiment-analysis',
            name: 'AnalyzeFeedback',
            provider: 'open-ai',
            inputs: {
                prompt: `You are a customer feedback analyzer. Your role is to process customer feedback and provide insights such as: 
                            - Key themes (e.g., product issues, feature requests)
                            - Sentiment (positive, negative, neutral)
                            - Actionable recommendations
                            Feedback: @feedback`,
                temperature: 0.7, // Adds variability for creative summarization
                model: "gpt-4o-mini", // Specify the model
                responseType: "text",
            },
            behaviours: [],
        }
    ]
} as IAgent;

// Add the configuration to the agent
feedbackAgent.addConfig(agentDetails);
```

**👉 What’s happening here?**

You’re creating an agent `feedbackAgent` and specifying its name, description, and behaviors. Each behavior defines how the agent interacts with the OpenAI provider.

***
### Step 4: Run the Agent
Finally, run the agent with a custom prompt:
```typescript
const feedback = "The app is great, but I wish the loading time was faster. Also, adding dark mode would be helpful.";
const result = feedbackAgent.run({ feedback });

console.log("Feedback Analysis Result:", result);

main();
```

**👉 What’s happening here?**

The `run()` method executes the agent with the given prompt and logs the results.

***
#### Ready to build your first AI-powered agent? 🚀 Dive into the [Documentation]() and start exploring today!
***

## 🌐 Community

Join our community to connect, share ideas, and get support:

- [Discord](https://discord.com/invite/example)
- [Telegram](https://t.me/example)

We’d love to hear from you and help you build amazing projects!
***

## 📜 License

This project is licensed under the **MIT License**.  
See the [LICENSE](./LICENSE) file for details.