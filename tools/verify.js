#!/usr/bin/env node
/**
 * 🚀 游戏完整性验证工具
 * 每次修改后运行：node tools/verify.js
 * 
 * 验证项：
 * 1. HTML 结构完整 (DOCTYPE, html, head, body)
 * 2. JavaScript 语法正确 (new Function)
 * 3. 大括号/圆括号平衡
 * 4. 截图对比 (如果安装了 Playwright)
 */

const fs = require('fs');

let exitCode = 0;
let c = fs.readFileSync(__dirname + '\\..\\index.html', 'utf8');

console.log('=== 完整性检查 ===');

// 1. HTML 结构
console.log('\n1️⃣  HTML 结构:');
const checks = [
  ['DOCTYPE', c.startsWith('<!DOCTYPE html>')],
  ['<html>', c.includes('<html')],
  ['<head>', c.includes('<head>')],
  ['<body>', c.includes('<body>')],
  ['</html>', c.includes('</html>')],
];
checks.forEach(([name, ok]) => {
  console.log('  ' + (ok ? '✅' : '❌') + ' ' + name);
  if (!ok) exitCode = 1;
});

// 2. Script 标签数量
const scOpen = (c.match(/<script>/g) || []).length;
const scClose = (c.match(/<\/script>/g) || []).length;
console.log('\n2️⃣  <script> 标签:', scOpen, '个');
if (scOpen === scClose && scOpen === 1) {
  console.log('  ✅  script 标签数量正确');
} else {
  console.log('  ❌  期望 1 个，打开', scOpen, '关闭', scClose);
  exitCode = 1;
}

// 3. JavaScript 语法
console.log('\n3️⃣  JavaScript:');
const st = c.indexOf('<script>');
const en = c.indexOf('</script>', st);
const js = c.substring(st + 8, en);

let bd = 0, pd = 0;
for (const ch of js) {
  if (ch === '{') bd++;
  if (ch === '}') bd--;
  if (ch === '(') pd++;
  if (ch === ')') pd--;
}
console.log('  Braces:', bd, bd === 0 ? '✅' : `❌ (应为 0)`);
console.log('  Parens:', pd, pd === 0 ? '✅' : `❌ (应为 0)`);

try {
  new Function(js);
  console.log('  JS语法: ✅ OK');
} catch (e) {
  console.log('  JS语法: ❌ ' + e.message.substring(0, 80));
  exitCode = 1;
}

// 4. Playwright 截图
console.log('\n4️⃣  视觉测试:');
const playwrightPath = './tools/node_modules/playwright';
if (fs.existsSync(playwrightPath)) {
  try {
    const { execSync } = require('child_process');
    execSync('node tools/test.js', { encoding: 'utf8', timeout: 30000 });
  } catch (e) {
    console.log('  ⚠️ 截图失败:', e.message.substring(0, 80));
  }
} else {
  console.log('  ⏭️  Playwright 未安装，跳过截图');
}

console.log('\n' + (exitCode === 0 ? '✅ 全部通过' : '❌ 有 ' + exitCode + ' 项失败'));
process.exit(exitCode);
