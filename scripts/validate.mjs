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
const MCP_TOOLS = ["check_setup", "create_public_key"];
/** Tools the server no longer has: each operation is now a tool of its own. */
const REMOVED_TOOLS = /`(search_tools|describe_tools|execute_tool)`/g;
/** Operations named the old way; tool names are snake_case, like `contact_properties_list`. */
const DOTTED_OPERATION = /`(broadcasts|contactProperties|contacts|email|eventDefinitions|events|insights|leadMagnets|metrics|newsletters|presets|segments|workflows)\.[a-zA-Z.]+`/g;
/** Names the API dropped in the Contacts and Workflows rename; skills must use the current ones. */
const REMOVED = /`(journeys|users|userProperties|funnel)\.[a-zA-Z.]+`/g;

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
  maxLength(`${where}.developerName`, ui.developerName, 80);
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

// OpenAI consumes the portable extension in preference to the compatibility manifest.
const openai = agent?.extensions?.["com.openai"];
if (!openai) fail("plugin.json", "extensions.com.openai is required for publication");
if (openai) {
  if (JSON.stringify(openai.interface) !== JSON.stringify(codex?.interface)) fail("plugin.json", "OpenAI listing must match the Codex compatibility listing");
  asset("plugin.json onboardingSkill", openai.onboardingSkill);
  const cases = openai.review?.test_cases;
  for (const [kind, count] of [["positive", 5], ["negative", 3]]) {
    const entries = cases?.[kind];
    if (!Array.isArray(entries) || entries.length !== count) {
      fail(`plugin.json review.${kind}`, `exactly ${count} cases required`);
      continue;
    }
    entries.forEach((entry, i) => {
      const where = `plugin.json review.${kind}[${i}]`;
      for (const field of ["description", "prompt", "expected_behavior", ...(kind === "positive" ? ["tools_triggered"] : [])]) maxLength(`${where}.${field}`, entry[field], 4000);
      if (/search_tools|describe_tools|execute_tool/.test(entry.tools_triggered ?? "")) fail(where, "references removed meta-tools");
    });
  }
  if (openai.review?.demo_recording_url && !/^https:\/\//.test(openai.review.demo_recording_url)) fail("plugin.json review.demo_recording_url", "must be an HTTPS URL");
  maxLength("plugin.json release notes", openai.publication?.release_notes, 4000);
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
  const auth = server(agentMcp)?.extensions?.["com.openai"]?.auth;
  if (auth?.type !== "oauth" || auth?.client?.mode !== "cimd") fail("mcp.json", "OpenAI OAuth must prefer CIMD");
  for (const scope of ["journeykit:read", "journeykit:write", "offline_access"]) {
    if (!auth?.baseScopes?.includes(scope)) fail("mcp.json", `missing OAuth scope ${scope}`);
  }
  if (auth?.clientSecret || server(agentMcp)?.headers) fail("mcp.json", "must not embed OAuth secrets or request headers");
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
  for (const [name] of body.matchAll(REMOVED)) fail(path, `removed operation ${name}`);
  for (const [name] of body.matchAll(REMOVED_TOOLS)) fail(path, `removed tool ${name}`);
  for (const [name] of body.matchAll(DOTTED_OPERATION)) fail(path, `${name} must use the tool's snake_case name`);
  for (const [, tool] of body.matchAll(/`([a-z]+_[a-z_]+)`/g)) {
    if (/^(check|create)_/.test(tool) && !MCP_TOOLS.includes(tool)) fail(path, `unknown MCP tool "${tool}"`);
  }
}

// --- result ----------------------------------------------------------------

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ plugin "${NAME}" v${claude?.version}: ${skills.length} skills, manifests and MCP configs consistent`);
