const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

console.log("=== 完善巨将逻辑验证 ===\n");

// 1. Click matching - any of 4 cells
console.log("1. 四格点击移动:");
let hasFourCellMatch1 = c.includes("logicRow >= m.toRow && logicRow <= m.toRow+1 && logicCol >= m.toCol && logicCol <= m.toCol+1");
let hasFourCellMatch2 = c.includes("logicRow>=m.toRow&&logicRow<=m.toRow+1&&logicCol>=m.toCol&&logicCol<=m.toCol+1");
console.log(hasFourCellMatch1 || hasFourCellMatch2 ? "   ✅ 点击匹配任何四格" : "   ❌ 点击匹配未更新");

// 2. Knockback in attackedGiant
console.log("2. 弹飞逻辑:");
let hasKnockback = c.includes("💨") && c.includes("被弹飞");
let hasKnockbackSearch = c.includes("landRow = fromR") && c.includes("dirRow") && c.includes("foundSafe");
console.log(hasKnockback ? "   ✅ 弹飞逻辑存在 (💨 日志)" : "   ❌ 弹飞日志未找到");
console.log(hasKnockbackSearch ? "   ✅ 弹飞搜索算法存在" : "   ❌ 弹飞搜索算法未找到");

let hasKnockbackCode = c.includes("// 巨将未死：攻击棋子被弹飞");
console.log(hasKnockbackCode ? "   ✅ 弹飞代码注释存在" : "   ❌ 弹飞代码注释未找到");

// 3. TianJiang strong attack on giant
console.log("3. 天将强杀巨将:");
let hasTjGiantAttack = c.includes("tjGiantTarget") || c.includes("isStrongKill");
console.log(hasTjGiantAttack ? "   ✅ 天将攻击巨将检测存在" : "   ❌ 天将攻击巨将检测未找到");

let hasTjStrongKill = c.includes("⚔️ 天将强杀巨将");
console.log(hasTjStrongKill ? "   ✅ 强杀日志 (⚔️)" : "   ❌ 强杀日志未找到");

let hasTjNormalAttack = c.includes("💢 天将攻击巨将，1点伤害");
console.log(hasTjNormalAttack ? "   ✅ 普通攻击日志 (💢)" : "   ❌ 普通攻击日志未找到");

// 4. Verify no template literal issues
console.log("\n4. 完整性检查:");
// Check that the template literals are correct in the HTML
// The file should contain: log(`...${...}...`)
let hasTemplate1 = c.includes("log(`💢 巨将受创！剩余生命：${attackedGiant.hp}`");
let hasTemplate2 = c.includes("log(`💨 ${piece.name} 被弹飞！`");
let hasTemplate3 = c.includes("log(`⚔️ 天将强杀巨将！2点伤害！`");
let hasTemplate4 = c.includes("log(`💢 天将攻击巨将，1点伤害`");
let hasTemplate5 = c.includes("log(`💀 巨将崩毁！`");
console.log(hasTemplate1 ? "   ✅ 受伤日志模板正确" : "   ⚠️ 受伤日志模板可能有问题");
console.log(hasTemplate2 ? "   ✅ 弹飞日志模板正确" : "   ⚠️ 弹飞日志模板可能有问题");
console.log(hasTemplate3 ? "   ✅ 强杀日志模板正确" : "   ⚠️ 强杀日志模板可能有问题");
console.log(hasTemplate4 ? "   ✅ 天将普通攻击日志模板正确" : "   ⚠️ 天将普通攻击日志模板可能有问题");
console.log(hasTemplate5 ? "   ✅ 死亡日志模板正确" : "   ⚠️ 死亡日志模板可能有问题");

// Summary
console.log("\n========================================");
console.log("验证完成！");
console.log("========================================");
