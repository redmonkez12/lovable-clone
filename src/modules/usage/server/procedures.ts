﻿import {createTRPCRouter, protectedProcedure} from "@/trpc/init";
import {getUsageStatus} from "@/lib/usage";

export const usageRouter = createTRPCRouter({
    status: protectedProcedure.query(async ({ctx}) => {
       try {
            const result = await getUsageStatus();

            return result;
       }  catch {
           return null;
       }
    }),
});
