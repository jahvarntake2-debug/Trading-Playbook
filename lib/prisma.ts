import { PrismaClient } from '@prisma/client';

// PrismaClient is a singleton in development to avoid opening many database connections.
// This keeps the app stable during hot reloads in local development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
