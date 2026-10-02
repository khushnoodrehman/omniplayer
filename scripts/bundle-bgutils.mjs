import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'src', 'assets', 'generated');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const entryContent = `
import { BotGuardClient } from 'bgutils-js/botguard';
import { WebPoMinter, createColdStartToken, decodeColdStartToken } from 'bgutils-js/webpo';
import { base64ToU8, u8ToBase64 } from 'bgutils-js/utils';

// Expose on global window object
window.BgUtils = {
  BotGuardClient,
  WebPoMinter,
  createColdStartToken,
  decodeColdStartToken,
  base64ToU8,
  u8ToBase64
};
`;

const tempEntryFile = path.resolve(__dirname, '_temp_bgutils_entry.js');
fs.writeFileSync(tempEntryFile, entryContent, 'utf-8');

const bundleOutFile = path.resolve(outDir, 'botguard-runner.bundle.js');

try {
  console.log('[bundle-bgutils] Bundling bgutils-js with esbuild...');
  await esbuild.build({
    entryPoints: [tempEntryFile],
    bundle: true,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    outfile: bundleOutFile,
  });

  const stats = fs.statSync(bundleOutFile);
  console.log(`[bundle-bgutils] Successfully generated bundle at: ${bundleOutFile} (${(stats.size / 1024).toFixed(2)} KB)`);
} finally {
  if (fs.existsSync(tempEntryFile)) {
    fs.unlinkSync(tempEntryFile);
  }
}
