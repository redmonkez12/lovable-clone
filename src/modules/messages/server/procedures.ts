import {protectedProcedure, createTRPCRouter} from "@/trpc/init";
import {inngest} from "@/inngest/client";
import {generateSlug} from "random-word-slugs";
import prisma from "@/lib/db";
import z from "zod";
import {TRPCError} from "@trpc/server";

export const projectsRouter = createTRPCRouter({
    getOne: protectedProcedure
        .input(z.object({
            id: z.string().min(1, {message: "Id is required "})
        }))
        .query(async ({input, ctx}) => {
            const existingProject = await prisma.project.findUnique({
                where: {
                    id: input.id,
                    userId: ctx.auth.userId,
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
    getMany: protectedProcedure.query(async ({ctx}) => {
        const projects = await prisma.project.findMany({
            where: {
                userId: ctx.auth.userId,
            },
            orderBy: {
                updatedAt: "desc",
            }
        });

        return projects;
    }),
    create: protectedProcedure
        .input(z.object({
            value: z.string()
                .min(1, {message: "Message is required"})
                .max(10000, {message: "Message is too long"}),
        }))
        .mutation(async ({input, ctx}) => {
            const createdProject = await prisma.project.create({
                data: {
                    userId: ctx.auth.userId,
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
    getMany: protectedProcedure
        .input(z.object({
            projectId: z.string().min(1, {message: "Project ID is required"}),
        }))
        .query(async ({input, ctx}) => {
            const messages = await prisma.message.findMany({
                where: {
                    projectId: input.projectId,
                    project: {
                        userId: ctx.auth.userId,
                    },
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
    create: protectedProcedure
        .input(z.object({
            value: z.string()
                .min(1, {message: "Message is required"})
                .max(10000, {message: "Message is too long"}),
            projectId: z.string().min(1, {message: "Project ID is required"}),
        }))
        .mutation(async ({input, ctx}) => {
            const existingProject = await prisma.project.findUnique({
                where: {
                    id: input.projectId,
                    userId: ctx.auth.userId,
                },
            });

            if (!existingProject) {
                throw new TRPCError({code: "NOT_FOUND", message: "Project not found"});
            }

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
        }),
});
