import fs from 'fs';
import path from 'path';

type LocalImportConfig = {
  dietFiles?: string[];
  breakfastSource?: string;
  breakfastLabel?: string;
  ocrRoot?: string;
  ocrLabels?: {
    lunch?: string;
    obiad?: string;
    kolacja?: string;
  };
};

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'local-imports.json');
const DEFAULT_DIETS_DIR = path.join(ROOT, 'private', 'imports', 'diets');
const DEFAULT_BREAKFAST_SOURCE = path.join(ROOT, 'private', 'imports', 'sniadania.md');
const DEFAULT_OCR_ROOT = path.join(ROOT, 'private', 'imports', 'ocr');

function resolveRepoPath(inputPath: string): string {
  return path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath);
}

function loadConfig(): LocalImportConfig {
  if (!fs.existsSync(CONFIG_PATH)) return {};

  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as LocalImportConfig;
}

export function getDietFiles(): string[] {
  const config = loadConfig();
  if (config.dietFiles?.length) {
    return config.dietFiles.map(resolveRepoPath);
  }

  if (!fs.existsSync(DEFAULT_DIETS_DIR)) return [];

  return fs.readdirSync(DEFAULT_DIETS_DIR)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(DEFAULT_DIETS_DIR, name));
}

export function getBreakfastSource() {
  const config = loadConfig();
  return {
    inputPath: resolveRepoPath(config.breakfastSource ?? DEFAULT_BREAKFAST_SOURCE),
    sourceDiet: config.breakfastLabel ?? 'Zestaw sniadan lokalny',
  };
}

export function getOcrConfig() {
  const config = loadConfig();
  const ocrRoot = resolveRepoPath(config.ocrRoot ?? DEFAULT_OCR_ROOT);

  return {
    ocrRoot,
    labels: {
      lunch: config.ocrLabels?.lunch ?? 'Import OCR Lunch lokalny',
      obiad: config.ocrLabels?.obiad ?? 'Import OCR Obiad lokalny',
      kolacja: config.ocrLabels?.kolacja ?? 'Import OCR Kolacja lokalny',
    },
  };
}

export function getLocalImportSetupHint(): string {
  return [
    'Skonfiguruj lokalny import przez `config/local-imports.json`',
    'albo dodaj pliki do `private/imports/` zgodnie z `config/local-imports.example.json`.',
  ].join(' ');
}
