#!/usr/bin/env node
import * as yargs from "yargs";
import * as postAPI from "./api";

// node dist/app-cli.js --help
// node dist/app-cli.js --api getPost
const parser = yargs(process.argv.slice(2)).options({
  api: { type: "string", description: "getPost API" },
}).argv;

(async () => {
  const argv = await parser;

  if (argv.api) {
    if (argv.api == "getPost") console.log(postAPI.getPost());
  }
})();
