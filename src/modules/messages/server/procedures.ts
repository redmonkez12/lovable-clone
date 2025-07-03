﻿import {baseProcedure, createTRPCRouter} from "@/trpc/init";
import {inngest} from "@/inngest/client";
import {generateSlug} from "random-word-slugs";
import prisma from "@/lib/db";
import z from "zod";
import {TRPCError} from "@trpc/server";

export const projectsRouter = createTRPCRouter({
    getOne: baseProcedure
        .input(z.object({
            id: z.string().min(1, {message: "Id is required "})
        }))
        .query(async ({input}) => {
            const existingProject = await prisma.project.findUnique({
                where: {
                    id: input.id,
                },
                include: {
                    messages: {
                        include: {
                            fragment: true,
                        }
                    }
                }
            });

            if (!existingProject) {
                throw new TRPCError({code: "NOT_FOUND", message: "Project not found"});
            }

            return existingProject;
        }),
    getMany: baseProcedure.query(async () => {
        const projects = await prisma.project.findMany({
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
            const createdProject = await prisma.project.create({
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
                    projectId: createdProject.id,
                }
            });

            return createdProject;
        })
});


export const messageRouter = createTRPCRouter({
    getMany: baseProcedure
        .input(z.object({
            projectId: z.string().min(1, {message: "Project ID is required"}),
        }))
        .query(async ({input}) => {
            const messages = await prisma.message.findMany({
                where: {
                    projectId: input.projectId,
                },
                include: {
                    fragment: true,
                },
                orderBy: {
                    updatedAt: "asc",
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
