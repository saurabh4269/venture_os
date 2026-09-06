import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { V3Corpus } from "./map.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function corpusPath(): string {
  return resolve(__dirname, "../../../fixtures/v3-onboard/corpus.json");
}

export function loadV3Corpus(): V3Corpus {
  const raw = readFileSync(corpusPath(), "utf8");
  return JSON.parse(raw) as V3Corpus;
}
