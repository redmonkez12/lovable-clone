﻿import {z} from "zod";
import TextareaAutosize from "react-textarea-autosize";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form, FormField} from "@/components/ui/form";
import {cn} from "@/lib/utils";
import {useState} from "react";
import {ArrowUpIcon, Loader2Icon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useTRPC} from "@/trpc/client";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import {PROJECT_TEMPLATES} from "@/app/(home)/constants";
import {useClerk} from "@clerk/nextjs";
import {dark} from "@clerk/themes";
import {useCurrentTheme} from "@/hooks/use-current-theme";

const formSchema = z.object({
    value: z.string().min(1).max(1000, {message: "Value is too long"}),

});

export const ProjectForm = () => {
    const router = useRouter();
    const currentTheme = useCurrentTheme();
    const trpc = useTRPC();
    const clerk = useClerk();
    const queryClient = useQueryClient();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            value: "",
        },
    })

    const createProject = useMutation(trpc.projects.create.mutationOptions({
        onSuccess(data) {
            queryClient.invalidateQueries(
                trpc.projects.getMany.queryOptions(),
            );
            queryClient.invalidateQueries(
                trpc.usage.status.queryOptions(),
            );
            router.push(`/projects/${data.id}`);
        },
        onError(error) {
            toast.error(error.message);
            if (error.data?.code === "UNAUTHORIZED") {
                clerk.openSignIn({
                    appearance: {
                        baseTheme: currentTheme === "dark" ? dark : undefined,
                    },
                });
            }

            if (error.data?.code === "TOO_MANY_REQUESTS") {
                router.push("/pricing");
            }
        },
    }));

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        await createProject.mutateAsync({
            value: values.value,
        });
    }

    const onSelect = (value: string) => {
        form.setValue("value", value, {
            shouldDirty: true,
            shouldValidate: true,
            shouldTouch: true,
        });
    }

    const [isFocused, setIsFocused] = useState(false);
    const isPending = createProject.isPending;
    const isButtonDisabled = isPending || !form.formState.isValid;

    return (
        <Form {...form}>
            <section className="space-y-6">
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className={cn("relative border p-4 pt-1 rounded-xl bg-sidebar dark:bg-sidebar transition-all",
                        isFocused && "shadow-xs",
                    )}
                >
                    <FormField
                        name="value"
                        render={({field}) => (
                            <TextareaAutosize
                                {...field}
                                disabled={isPending}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                minRows={2}
                                maxRows={8}
                                className="pt-4 resize-none border-none w-full outline-none bg-transparent"
                                placeholder="What would  you like to build?"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                        e.preventDefault();
                                        form.handleSubmit(onSubmit)(e);
                                    }
                                }}
                            />
                        )}
                    />

                    <div className="flex gap-x-2 items-end justify-between p-2">
                        <div className="text-[10px] text-muted-foreground font-mono">
                            <kdb
                                className="ml-auto pointer-events-none inlint-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                <span>&#8984;</span>Enter
                            </kdb>
                            &nbsp;to submit
                        </div>

                        <Button className={cn("size-8 rounded-full", isButtonDisabled && "bg-muted-foreground border")}
                                disabled={isButtonDisabled}>
                            {isPending ? <Loader2Icon className="animate-spin size-4"/> : <ArrowUpIcon/>}
                        </Button>
                    </div>
                </form>


                <div className="flex-wrap justify-center gap-2 hidden md:flex max-w-3xl">
                    {PROJECT_TEMPLATES.map(template => (
                        <Button
                            key={template.title}
                            variant="outline"
                            size="sm"
                            className="bg-white dark:bg-sidebar"
                            onClick={() => onSelect(template.prompt)}
                        >{template.emoji} {template.title}</Button>
                    ))}
                </div>
            </section>
        </Form>
    );
}