#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
execFileSync(process.execPath, [join(root, "scripts/validate.mjs")], { cwd: root, stdio: "inherit" });
const manifest = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
const destination = join(root, "dist");
mkdirSync(destination, { recursive: true });
const output = join(destination, `journeykit-${manifest.version}-openai.zip`);
rmSync(output, { force: true });
execFileSync("zip", ["-X", "-q", "-r", output, "plugin.json", "mcp.json", "skills", "assets", "LICENSE", "-x", "*/.DS_Store", "*/__pycache__/*"], { cwd: root, stdio: "inherit" });
console.log(output);
if (!manifest.extensions["com.openai"].review.demo_recording_url) {
  console.log("Video URL is not configured. Record and run the review cases before submitting for review.");
}
