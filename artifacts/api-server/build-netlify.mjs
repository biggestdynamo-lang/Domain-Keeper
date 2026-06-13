import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(artifactDir, "../..");

async function buildFunction() {
  const distDir = path.resolve(rootDir, "netlify/dist/functions");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(rootDir, "netlify/functions/api.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "bufferutil",
      "utf-8-validate",
      "pg-native",
      "oracledb",
      "nodemailer",
      "lightningcss",
      "@prisma/client",
      "@aws-sdk/*",
      "@google-cloud/*",
      "firebase-admin",
    ],
    sourcemap: false,
    plugins: [
      esbuildPluginPino({ transports: ["pino-pretty"] }),
    ],
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
    },
  });
}

buildFunction().catch((err) => {
  console.error(err);
  process.exit(1);
});
