#!/usr/bin/env node
// Checks that the plugin's manifests, MCP configs and skills agree with each
// other and with each directory's documented limits. No dependencies: run
// with `node scripts/validate.mjs`. Exits non-zero on the first run with errors.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);

const NAME = "journeykit";
const MCP_URL = "https://journeykit.io/api/mcp";
/** Tools the JourneyKit MCP server exposes; skills may only reference these. */
const MCP_TOOLS = ["check_setup", "create_public_key", "search_tools", "describe_tools", "execute_tool"];

function json(path) {
  const file = join(root, path);
  if (!existsSync(file)) return fail(path, "missing"), undefined;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    return fail(path, `invalid JSON: ${error.message}`), undefined;
  }
}

function asset(where, path) {
  if (typeof path !== "string" || !path.startsWith("./")) return fail(where, `"${path}" must be a ./-relative path`);
  if (!existsSync(join(root, path))) fail(where, `"${path}" does not exist`);
}

function maxLength(where, value, limit) {
  if (typeof value !== "string" || value.length === 0) fail(where, "is required");
  else if (value.length > limit) fail(where, `is ${value.length} characters; the limit is ${limit}`);
}

// --- manifests -------------------------------------------------------------

const agent = json("plugin.json");
const claude = json(".claude-plugin/plugin.json");
const codex = json(".codex-plugin/plugin.json");
const claudeMarket = json(".claude-plugin/marketplace.json");
const codexMarket = json(".agents/plugins/marketplace.json");

for (const [path, manifest] of [["plugin.json", agent], [".claude-plugin/plugin.json", claude], [".codex-plugin/plugin.json", codex]]) {
  if (!manifest) continue;
  if (manifest.name !== NAME) fail(path, `name must be "${NAME}"`);
  if (!manifest.description) fail(path, "description is required");
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) fail(path, "version must be semver");
}
const versions = new Set([agent?.version, claude?.version, codex?.version]);
if (versions.size > 1) fail("manifests", `versions differ: ${[...versions].join(", ")}`);

if (agent && agent.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") fail("plugin.json", "$schema must be the Agent Plugins 1.0.0 schema");
if (claude?.icon) asset(".claude-plugin/plugin.json icon", claude.icon);

if (codex) {
  const ui = codex.interface ?? {};
  const where = ".codex-plugin/plugin.json interface";
  maxLength(`${where}.displayName`, ui.displayName, 30);
  maxLength(`${where}.shortDescription`, ui.shortDescription, 30);
  maxLength(`${where}.longDescription`, ui.longDescription, 4000);
  maxLength(`${where}.developerName`, ui.developerName, 100);
  for (const key of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    if (!/^https:\/\//.test(ui[key] ?? "")) fail(`${where}.${key}`, "must be an https URL");
  }
  const prompts = [].concat(ui.defaultPrompt ?? []);
  if (prompts.length > 3) fail(`${where}.defaultPrompt`, "at most 3 prompts");
  prompts.forEach((prompt, i) => maxLength(`${where}.defaultPrompt[${i}]`, prompt, 128));
  for (const key of ["composerIcon", "logo"]) asset(`${where}.${key}`, ui[key]);
  if (codex.skills !== "./skills/") fail(".codex-plugin/plugin.json", 'skills must be "./skills/"');
  if (codex.mcpServers !== "./.mcp.json") fail(".codex-plugin/plugin.json", 'mcpServers must be "./.mcp.json"');
}

if (claudeMarket && !(claudeMarket.plugins ?? []).some((p) => p.name === NAME && p.source === "./")) {
  fail(".claude-plugin/marketplace.json", `must list "${NAME}" with source "./"`);
}
if (codexMarket && !(codexMarket.plugins ?? []).some((p) => p.name === NAME && p.source?.path === "./")) {
  fail(".agents/plugins/marketplace.json", `must list "${NAME}" with source path "./"`);
}

// --- MCP configs -----------------------------------------------------------

const dotMcp = json(".mcp.json");
const agentMcp = json("mcp.json");
const server = (config) => config?.mcpServers?.[NAME];
if (dotMcp && (server(dotMcp)?.type !== "http" || server(dotMcp)?.url !== MCP_URL)) {
  fail(".mcp.json", `mcpServers.${NAME} must be { type: "http", url: "${MCP_URL}" }`);
}
if (agentMcp) {
  if (agentMcp.$schema !== "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json") fail("mcp.json", "$schema must be the Agent Plugins 1.0.0 MCP schema");
  if (server(agentMcp)?.type !== "streamable-http" || server(agentMcp)?.url !== MCP_URL) {
    fail("mcp.json", `mcpServers.${NAME} must be { type: "streamable-http", url: "${MCP_URL}" }`);
  }
}
for (const [path, config] of [[".mcp.json", dotMcp], ["mcp.json", agentMcp]]) {
  if (config && /jk_(live|pub)_/.test(JSON.stringify(config))) fail(path, "must not contain an API key");
}

// --- skills ----------------------------------------------------------------

const skillsDir = join(root, "skills");
const skills = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];
if (skills.length === 0) fail("skills/", "no skills found");

for (const { name: dir } of skills) {
  const path = `skills/${dir}/SKILL.md`;
  const file = join(root, path);
  if (!existsSync(file)) {
    fail(path, "missing");
    continue;
  }
  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    fail(path, "must start with YAML frontmatter");
    continue;
  }
  const frontmatter = Object.fromEntries(
    match[1].split("\n").map((line) => line.match(/^([a-z-]+):\s*(.*)$/)).filter(Boolean).map(([, key, value]) => [key, value.trim()]),
  );
  if (frontmatter.name !== dir) fail(path, `frontmatter name "${frontmatter.name}" must equal the directory name "${dir}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(dir) || dir.length > 64) fail(path, "name must be lowercase kebab-case, at most 64 characters");
  maxLength(`${path} description`, frontmatter.description, 1024);

  const body = text.slice(match[0].length);
  for (const [, target] of body.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
    if (/^[a-z]+:/.test(target)) continue;
    if (!existsSync(join(dirname(file), target))) fail(path, `link "${target}" does not resolve`);
  }
  if (/jk_(live|pub)_[0-9a-f]{8,}/.test(text)) fail(path, "must not contain an API key");
  for (const [, tool] of body.matchAll(/`([a-z]+_[a-z_]+)`/g)) {
    if (/^(check|create|search|describe|execute)_/.test(tool) && !MCP_TOOLS.includes(tool)) fail(path, `unknown MCP tool "${tool}"`);
  }
}

// --- result ----------------------------------------------------------------

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ plugin "${NAME}" v${claude?.version}: ${skills.length} skills, manifests and MCP configs consistent`);
