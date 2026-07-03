import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.tsx')) files.push(full);
  }
  return files;
}

const replacements = [
  [/className="p-8 space-y-8 min-h-screen/g, 'className="page-padding space-y-6 sm:space-y-8 min-h-screen'],
  [/className="p-6 max-w-/g, 'className="page-padding max-w-'],
  [/className="p-6 space-y-/g, 'className="page-padding space-y-'],
  [/<div className="p-6">/g, '<div className="page-padding">'],
  [/px-6 py-8 lg:px-8/g, 'page-padding'],
  [/className="mx-auto min-h-0 max-w-\[1600px\] page-padding"/g, 'className="page-padding mx-auto min-h-0 max-w-[1600px]"'],
  [/className="mx-auto max-w-\[1200px\] page-padding"/g, 'className="page-padding mx-auto max-w-[1200px]"'],
  [/className="mx-auto max-w-\[1600px\] page-padding"/g, 'className="page-padding mx-auto max-w-[1600px]"'],
  [/className="pt-2 px-6 pb-6 max-w-/g, 'className="page-padding pt-2 max-w-'],
  [/className="px-8 py-6 flex flex-col/g, 'className="page-padding flex flex-col'],
  [/className="p-8 max-w-\[1600px\] mx-auto space-y-8 min-h-0 bg-\[#0B0F17\]"/g, 'className="page-padding mx-auto max-w-[1600px] space-y-6 sm:space-y-8 min-h-0 bg-[#0B0F17]"'],
  [/className="p-8 max-w-\[1600px\] mx-auto space-y-8"/g, 'className="page-padding mx-auto max-w-[1600px] space-y-6 sm:space-y-8"'],
  [/className="p-8 space-y-8"/g, 'className="page-padding space-y-6 sm:space-y-8"'],
];

let changed = 0;
for (const file of walk(root)) {
  let content = fs.readFileSync(file, 'utf8');
  let next = content;
  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }
  if (next !== content) {
    fs.writeFileSync(file, next);
    changed++;
    console.log('updated:', path.relative(root, file));
  }
}
console.log(`Done. ${changed} files updated.`);
