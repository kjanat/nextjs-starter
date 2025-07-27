import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // Or use adapter for D1 in production

export const createContext = () => ({ prisma });
export type Context = ReturnType<typeof createContext>;
