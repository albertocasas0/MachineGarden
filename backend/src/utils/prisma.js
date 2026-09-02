import { PrismaClient } from '@prisma/client';

// Singleton: evita crear múltiples conexiones en desarrollo (HMR).
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.__prisma ?? new PrismaClient();
if (!globalForPrisma.__prisma) globalForPrisma.__prisma = prisma;
