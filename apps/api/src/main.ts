import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind Fly's proxy: take the client IP from X-Forwarded-For so per-IP
  // rate limits don't lump every visitor into the proxy's single address.
  app.set('trust proxy', 1);

  const explicitOrigin = process.env.FRONTEND_URL;
  app.enableCors({
    // Reflect allowed origins. The live stream uses EventSource, which in prod
    // is cross-origin (Vercel → Fly); a single localhost default silently
    // blocks it and live scores never connect.
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Non-browser callers (curl, health checks, same-origin) send no Origin.
      if (!origin) return cb(null, true);
      const allowed =
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        /^https:\/\/[^/]+\.vercel\.app$/.test(origin) ||
        (explicitOrigin !== undefined && origin === explicitOrigin);
      cb(null, allowed);
    },
    credentials: true,
  });

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
  console.log(`PulseScore API running on port ${port}`);
}

void bootstrap();
