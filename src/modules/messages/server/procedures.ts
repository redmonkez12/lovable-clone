import {baseProcedure, createTRPCRouter} from "@/trpc/init";
import {inngest} from "@/inngest/client";
import {generateSlug} from "random-word-slugs";
import prisma from "@/lib/db";
import z from "zod";

export const projectsRouter = createTRPCRouter({
    projects: baseProcedure.query(async () => {
        const projects = await prisma.projects.findMany({
            orderBy: {
                updatedAt: "desc",
            }
        });

        return projects;
    }),
    create: baseProcedure
        .input(z.object({
            value: z.string()
                .min(1, {message: "Message is required"})
                .max(10000, {message: "Message is too long"}),
        }))
        .mutation(async ({input}) => {
            const createdProject = await prisma.projects.create({
                data: {
                    name: generateSlug(2, {
                        format: "kebab",
                    }),
                    messages: {
                        create: {
                            content: input.value,
                            role: "USER",
                            type: "RESULT",
                        }
                    }
                },
            })

            await inngest.send({
                name: "code-agent/run",
                data: {
                    value: input.value,
                }
            });

            return createdProject;
        })
});


export const messageRouter = createTRPCRouter({
    getMany: baseProcedure.query(async () => {
        const messages = await prisma.message.findMany({
            orderBy: {
                updatedAt: "desc",
            }
        });

        return messages;
    }),
    create: baseProcedure
        .input(z.object({
            value: z.string()
                .min(1, {message: "Message is required"})
                .max(10000, {message: "Message is too long"}),
            projectId: z.string().min(1, {message: "Project ID is required"}),
        }))
        .mutation(async ({input}) => {
            const createdMessage = await prisma.message.create({
                data: {
                    projectId: input.projectId,
                    content: input.value,
                    role: "USER",
                    type: "RESULT",
                }
            });

            await inngest.send({
                name: "code-agent/run",
                data: {
                    value: input.value,
                    projectId: input.projectId,
                }
            });

            return createdMessage;
        })
});
