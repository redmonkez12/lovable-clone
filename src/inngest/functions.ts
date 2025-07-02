import {Sandbox} from "@e2b/code-interpreter";
import {inngest} from "./client";
import {createAgent, createNetwork, createTool, anthropic, type Tool} from "@inngest/agent-kit";
import {getSandbox, lastAssistantTextMessageContent} from "@/inngest/utils";
import {z} from "zod";
import {PROMPT} from "@/prompts";
import prisma from "@/lib/db";

interface AgentState {
    summary: string;
    files: { [path: string]: string };
}

export const codeAgentFunction = inngest.createFunction(
    {id: "code-agent"},
    {event: "code-agent/run"},
    async ({event, step}) => {
        const sandboxId = await step.run("get-sandbox-id", async () => {
            const sandbox = await Sandbox.create("vibe-nextjs-test-tomas-2");
            return sandbox.sandboxId;
        });

        // eslint-disable-next-line
        const createToolsWithStep = (inngestStep: any) => [
            createTool({
                name: "terminal",
                description: "Use the terminal to run commands",
                parameters: z.object({
                    command: z.string(),
                }),
                handler: async ({command}) => {
                    return await inngestStep.run(`terminal`, async () => {
                        const buffers = {stdout: "", stderr: ""};
                        try {
                            const sandbox = await getSandbox(sandboxId);
                            const result = await sandbox.commands.run(command, {
                                onStdout: (data: string) => {
                                    buffers.stdout += data;
                                },
                                onStderr: (data: string) => {
                                    buffers.stderr += data;
                                },
                            });
                            return result.stdout;
                        } catch (e) {
                            console.error(`Command failed: ${e}`);
                            return `Command failed: ${e} \nstdout ${buffers.stdout} \nstderr ${buffers.stderr}`;
                        }
                    });
                }
            }),
            createTool({
                name: "createOrUpdateFiles",
                description: "Create and update files in the sandbox",
                parameters: z.object({
                    files: z.array(z.object({
                        path: z.string(),
                        content: z.string(),
                    })),
                }),
                handler: async ({files}, {network}: Tool.Options<AgentState>) => {
                    let processedFiles = [];

                    if (Array.isArray(files)) {
                        processedFiles = files;
                    } else if (typeof files === 'string') {
                        const fileRegex = /"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*`([^`]*)`/g;

                        let match;
                        while ((match = fileRegex.exec(files)) !== null) {
                            processedFiles.push({
                                path: match[1],
                                content: match[2]
                            });
                        }

                        console.log(`Extracted ${processedFiles.length} files from string`);
                    }

                    const newFiles = await inngestStep.run(`create-files`, async () => {
                        try {
                            const updatedFiles = network.state.data.files || {};
                            const sandbox = await getSandbox(sandboxId);

                            for (const file of processedFiles) {
                                console.log(`Writing: ${file.path} (${file.content.length} bytes)`);
                                await sandbox.files.write(file.path, file.content);
                                updatedFiles[file.path] = file.content;
                            }

                            return updatedFiles;
                        } catch (e) {
                            console.error("Error:", e);
                            return "Error: " + e;
                        }
                    });

                    if (typeof newFiles === "object") {
                        network.state.data.files = newFiles;
                    }
                }
            }),
            createTool({
                name: "readFiles",
                description: "Read files from the sandbox",
                parameters: z.object({
                    files: z.array(z.string()),
                }),
                handler: async ({files}) => {
                    return await inngestStep.run(`read-files`, async () => {
                        try {
                            const sandbox = await getSandbox(sandboxId);
                            const contents = [];
                            for (const file of files) {
                                const content = await sandbox.files.read(file);
                                contents.push({path: file, content});
                            }
                            return JSON.stringify(contents);
                        } catch (e) {
                            console.error("Error reading files:", e);
                            return "Error: " + e;
                        }
                    });
                },
            }),
        ];

        const codeAgent = createAgent<AgentState>({
            name: "codeAgent",
            description: "An expert coding agent",
            system: PROMPT,
            model: anthropic({
                model: "claude-3-5-sonnet-20241022",
                apiKey: process.env.ANTHROPIC_API_KEY,
                defaultParameters: {
                    max_tokens: 8192,
                    temperature: 0.1,
                },
            }),
            tools: createToolsWithStep(step),
            lifecycle: {
                onResponse: async ({result, network}) => {
                    const lastAssistantMessageText = lastAssistantTextMessageContent(result);
                    if (lastAssistantMessageText && network) {
                        if (lastAssistantMessageText.includes("<task_summary>")) {
                            network.state.data.summary = lastAssistantMessageText;
                        }
                    }
                    return result;
                },
            },
        });

        const network = createNetwork<AgentState>({
            name: "coding-agent-network",
            agents: [codeAgent],
            maxIter: 15,
            router: async ({network}) => {
                const summary = network.state.data.summary;
                if (summary) {
                    return;
                }
                return codeAgent;
            },
        });

        const result = await network.run(event.data.value);

        const isError = !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0;

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await getSandbox(sandboxId);
            const host = sandbox.getHost(3000);
            return `https://${host}`;
        });

        await step.run("save-result", async () => {
            if (isError) {
                return prisma.message.create({
                    data: {
                        projectId: event.data.projectId,
                        content: "Something went wrong. Please try again.",
                        role: "ASSISTANT",
                        type: "ERROR",
                    },
                });
            }

            return await prisma.message.create({
                data: {
                    content: result.state.data.summary,
                    role: "ASSISTANT",
                    type: "RESULT",
                    fragment: {
                        create: {
                            sandboxUrl,
                            title: "Fragment",
                            files: result.state.data.files,
                        },
                    },
                }
            });
        });

        return {
            url: sandboxUrl,
            title: "Fragment",
            files: result.state.data.files,
            summary: result.state.data.summary,
        };
    },
);