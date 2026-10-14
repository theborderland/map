import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const esbuildPath = fileURLToPath(new URL("./node_modules/esbuild/bin/esbuild", import.meta.url));
const defineApiUrl = `--define:process.env.API_URL=${JSON.stringify(process.env.API_URL ?? "")}`;

const mode = process.argv[2];
const commonArgs = ["src/main.js", "--format=iife", "--bundle", "--outdir=../../public", defineApiUrl];
const modeArgs = {
  build: ["--minify"],
  dev: ["--sourcemap", "--watch", "--servedir=../../public", "--serve=localhost:3000"],
  serve: ["--sourcemap", "--servedir=../../public", "--serve=localhost:3000"],
}[mode];

if (!modeArgs) {
  console.error("Usage: node --env-file-if-exists=../../.env run-esbuild.mjs <build|dev|serve>");
  process.exitCode = 1;
} else {
  const result = spawnSync(esbuildPath, [...commonArgs, ...modeArgs], {
  env: process.env,
  stdio: "inherit",
  });

  process.exitCode = result.status ?? 1;
}