// https://www.prisma.io/docs/orm/overview/databases/cloudflare-d1#3-set-up-prisma-config-file
import path from "node:path";
import { PrismaD1 } from "@prisma/adapter-d1";
import "dotenv/config";

/** @type {import('prisma').PrismaConfig<{CLOUDFLARE_D1_TOKEN:string; CLOUDFLARE_ACCOUNT_ID:string; CLOUDFLARE_DATABASE_ID:string;}>} */
export default {
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
  migrate: {
    async adapter(env) {
      return new PrismaD1({
        token: env.CLOUDFLARE_D1_TOKEN,
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        databaseId: env.CLOUDFLARE_DATABASE_ID,
      });
    },
  },
};
