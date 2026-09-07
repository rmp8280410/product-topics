#!/usr/bin/env node
// 建置 .deploy/：從 git HEAD 匯出乾淨快照，並把「中文 English」資料夾名稱
// 對應成純英文的部署路徑，確保網址（product-topics.web.app/english/vX）
// 不受本機資料夾改用「中文 English」命名的影響。
//
// 用法：node build-deploy.mjs

import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, readdirSync, statSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const projectRoot = process.cwd();
const deployDir = join(projectRoot, '.deploy');
const tmpExtractDir = mkdtempSync(join(tmpdir(), 'topics-archive-'));

console.log('匯出 git HEAD 快照到暫存目錄...');
execSync(`git archive HEAD | tar -x -C "${tmpExtractDir}"`, { cwd: projectRoot, stdio: 'inherit' });

console.log('清空 .deploy...');
rmSync(deployDir, { recursive: true, force: true });
mkdirSync(deployDir, { recursive: true });

// 資料夾名稱裡如果含有空白，取「最後一個空白之後」的字串當作英文網址代稱
// 例如「重大傷病 ci」→ ci、「長照 ltc」→ ltc；沒有空白的資料夾（如未來新增的
// 純英文資料夾）就直接沿用原名。
function slugFor(name) {
  const idx = name.lastIndexOf(' ');
  return idx === -1 ? name : name.slice(idx + 1);
}

const topLevelEntries = readdirSync(tmpExtractDir);
const mapping = [];

for (const entry of topLevelEntries) {
  const srcPath = join(tmpExtractDir, entry);
  if (!statSync(srcPath).isDirectory()) continue; // 根目錄下的檔案（若有）不部署
  const slug = slugFor(entry);
  const destPath = join(deployDir, slug);
  cpSync(srcPath, destPath, { recursive: true });
  mapping.push([entry, slug]);
}

rmSync(tmpExtractDir, { recursive: true, force: true });

console.log('\n資料夾 → 部署路徑對照：');
mapping
  .sort((a, b) => a[1].localeCompare(b[1]))
  .forEach(([from, to]) => console.log(`  ${from}  →  .deploy/${to}`));

console.log(`\n完成，共 ${mapping.length} 個資料夾已部署到 .deploy/`);
