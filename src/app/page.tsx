import {useTRPC} from "@/trpc/client";

export default function Home() {
    const trpc = useTRPC();
    trpc.hello.queryOptions({ text: "hello "});

    return (
        <div>

        </div>
    );
}
