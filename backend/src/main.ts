import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { mkdirSync } from "fs";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  mkdirSync(join(process.cwd(), "uploads", "logos"), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Detrás de Traefik (Dokploy) hay un proxy: sin esto todas las peticiones parecerían venir de su IP
  // y el freno de intentos de login castigaría a todos a la vez.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((_req: unknown, res: { setHeader(nombre: string, valor: string): void }, next: () => void) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    }
    next();
  });

  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads/",
    // Los logos son solo imágenes: aunque un archivo se hiciera pasar por otra cosa, no ejecuta scripts.
    setHeaders: (res) => {
      res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  });
  app.enableCors({
    origin: configService.get<string>("CORS_ORIGIN", "http://localhost:5173"),
    exposedHeaders: ["X-Total-Count"],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = configService.get<number>("PORT", 3000);
  await app.listen(port);
}

bootstrap();
