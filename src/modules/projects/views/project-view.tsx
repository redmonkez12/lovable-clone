﻿"use client";

import {useTRPC} from "@/trpc/client";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {MessageContainer} from "@/modules/projects/ui/components/message-container";
import {Suspense} from "react";

interface Props {
    projectId: string;
}

export const ProjectView = ({projectId}: Props) => {
    const trpc = useTRPC();
    const {data: messages} = useSuspenseQuery(trpc.messages.getMany.queryOptions({
        projectId,
    }));

    return (
        <div className="h-screen">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                    defaultSize={35}
                    minSize={20}
                    className="flex flex-col min-h-0"
                >
                    <Suspense fallback={<p>Loading messages...</p>}>
                        <MessageContainer projectId={projectId}/>
                    </Suspense>
                </ResizablePanel>

                <ResizableHandle withHandle/>

                <ResizablePanel
                    defaultSize={65}
                    minSize={50}
                >
                    {JSON.stringify(messages, null, 2)}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
