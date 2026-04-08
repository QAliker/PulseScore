import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Used by the Prisma CLI (migrate deploy/dev, studio).
  // At runtime, the NestJS PrismaService uses the PrismaPg adapter instead.
  datasourceUrl: process.env.DATABASE_URL,
});
