﻿"use client";

import {useTRPC} from "@/trpc/client";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {MessageContainer} from "@/modules/projects/ui/components/message-container";
import {Suspense, useState} from "react";
import {Fragment} from "@/generated/prisma";
import { ProjectHeader } from "../ui/components/project-header";
import {FragmentWeb} from "@/modules/projects/ui/components/fragment-web";

interface Props {
    projectId: string;
}

export const ProjectView = ({projectId}: Props) => {
    const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);

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
                    <Suspense fallback={<p>Loading project...</p>}>
                       <ProjectHeader projectId={projectId}/>
                   </Suspense>
                    <Suspense fallback={<p>Loading messages...</p>}>
                        <MessageContainer
                            projectId={projectId}
                            activeFragment={activeFragment}
                            setActiveFragment={setActiveFragment}
                        />
                    </Suspense>
                </ResizablePanel>

                <ResizableHandle withHandle/>

                <ResizablePanel
                    defaultSize={65}
                    minSize={50}
                >
                    {activeFragment && (
                        <FragmentWeb data={activeFragment}/>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
