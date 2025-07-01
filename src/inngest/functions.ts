import { inngest } from "./client";
import {createAgent} from "@inngest/agent-kit";
import {anthropic} from "inngest";

export const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event }) => {
        const codeAgent = createAgent({
            name: "codeAgent",
            system: "You are an expert next.js developer. You are readable, maintainable code. You write simple Next.js & React snippets.",
            model: anthropic({
                model: "claude-3-5-haiku-20241022", apiKey: process.env.ANTHROPIC_API_KEY,
                defaultParameters: {
                    max_tokens: 1000,
                    temperature: 0.7,
                }
            }),
        });

        const { output } = await codeAgent.run(`Write the following snippet: ${event.data.value}`);

        return { output };
    },
);
