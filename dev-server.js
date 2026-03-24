#!/usr/bin/env node

// Load the Node.js compatibility shim first
require("./node-compat.cjs");

// Then start Next.js dev server
const { spawn } = require("child_process");

const args = process.argv.slice(2);
const next = spawn("next", ["dev", "--turbopack", ...args], {
  stdio: "inherit",
  shell: true,
});

next.on("exit", (code) => {
  process.exit(code);
});
