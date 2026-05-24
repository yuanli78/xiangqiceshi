const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// Check all key changes
console.log("=== 巨将规则实现验证 ===\n");

// 1. REVIVABLE_TYPES
console.log("1. 不可医疗复活:");
let revIdx = c.indexOf("REVIVABLE_TYPES");
let revLineEnd = c.indexOf("\n", revIdx);
let revLine = c.substring(revIdx, revLineEnd);
console.log("   " + revLine);
console.log(revLine.includes("虎") ? "   ❌ 巨将还在可复活列表中!" : "   ✅ 巨将不在可复活列表中");

// 2. Giants init with hp:4
console.log("\n2. 初始化生命值:");
let gIdx = c.indexOf("giants.push");
console.log("   " + c.substring(gIdx, gIdx + 65).trim());
console.log(c.includes("hp: 4") ? "   ✅ hp: 4 已设置" : "   ❌ hp: 4 未找到");

// 3. Move generation - own piece check
console.log("\n3. 移动规则（检查己方棋子和桥）:");
console.log(c.includes("hasOwnPiece") ? "   ✅ 含己方棋子检测" : "   ❌ 缺少己方棋子检测");
console.log(c.includes("isBridge") ? "   ✅ 含桥格检测" : "   ❌ 缺少桥格检测");

// 4. Crush attack
console.log("\n4. 碾压攻击:");
// Check if the 3-limit is removed
let giantGenIdx = c.indexOf("giants.filter(g=>g.color===color).forEach(g=>{");
let giantEnd = c.indexOf("});", giantGenIdx);
giantEnd = c.indexOf("});", giantEnd + 3);
let giantBlock = c.substring(giantGenIdx, giantEnd + 3);
let hasUnlimited = giantBlock.includes("canEatGiant = enemyCount > 0");
let hasThreeLimit = giantBlock.includes("<= 3");
console.log("   巨将移动生成块:");
console.log(giantBlock);
console.log(hasUnlimited ? "   ✅ 碾压无上限" : "   ❌ 可能有3个上限");
console.log(hasThreeLimit ? "   ❌ 还有3个上限限制" : "   ✅ 已移除3个上限限制");

// Check the actual eat logic in applyMove
let applyGiantIdx = c.indexOf("move.type===");
// Find the giant apply section
let giantApplyIdx = c.indexOf("} else if(move.type==='giant') {");
if (giantApplyIdx < 0) giantApplyIdx = c.indexOf("} else if(move.type===");
if (giantApplyIdx >= 0) {
  let giantApplyEnd = c.indexOf("} else {", giantApplyIdx);
  let giantApplyBlock = c.substring(giantApplyIdx, giantApplyEnd);
  console.log("\n   巨将移动处理(applyMove)部分:");
  // Check for eating logic
  if (giantApplyBlock.includes("enemiesUnderGiant")) {
    console.log("   ✅ 含碾压吃子逻辑");
    let eatSection = giantApplyBlock.substring(giantApplyBlock.indexOf("// 吃子"));
    if (eatSection.length > 100) eatSection = eatSection.substring(0, 500);
    console.log("   吃子逻辑片段:");
    console.log(eatSection.substring(0, 400));
    
    // Check for >3 random 3 logic
    if (giantApplyBlock.includes("sort(() => Math.random()") || giantApplyBlock.includes("toEat.length <= 3")) {
      console.log("   ✅ 含>3随机吃3逻辑");
    } else {
      console.log("   ❌ 缺少>3随机吃3逻辑");
    }
    if (giantApplyBlock.includes("deadPool")) {
      console.log("   ✅ 含死子池处理");
    }
  } else {
    console.log("   ❌ 缺少吃子逻辑");
  }
}

// 5. Cannon mount
console.log("\n5. 不能作为炮架:");
let cannonIdx = c.indexOf("// 炮类");
if (cannonIdx >= 0) {
  let cannonEnd = c.indexOf("\n     }", cannonIdx + 200);
  let cannonBlock = c.substring(cannonIdx, cannonEnd + 20);
  console.log("   " + cannonBlock.substring(0, 200));
  console.log(c.includes("巨将不能作为炮架") ? "   ✅ 炮架跳过巨将" : "   ❌ 炮架未跳过巨将");
}

// 6. HP system
console.log("\n6. 生命值系统:");
let attackedIdx = c.indexOf("attackedGiant.hp--");
if (attackedIdx >= 0) {
  let contextStart = Math.max(0, attackedIdx - 200);
  let contextEnd = attackedIdx + 200;
  console.log("   ✅ HP减一逻辑存在");
  console.log("   上下文: " + c.substring(contextStart, contextEnd));
}

// Check death
console.log(c.includes("💀 巨将崩毁") ? "   ✅ 死亡日志" : "   ❌ 缺少死亡日志");
console.log(c.includes("💢 巨将受创") ? "   ✅ 受伤日志" : "   ❌ 缺少受伤日志");

// 7. UI
console.log("\n7. UI优化:");
console.log(c.includes("Math.max(0, g.hp / 4)") ? "   ✅ 血条比例" : "   ❌ 缺少血条比例");
console.log(c.includes("'#4caf50'") ? "   ✅ 血条颜色(绿)" : "   ❌ 缺少绿色");
console.log(c.includes("'#ff9800'") ? "   ✅ 血条颜色(橙)" : "   ❌ 缺少橙色");
console.log(c.includes("'#f44336'") ? "   ✅ 血条颜色(红)" : "   ❌ 缺少红色");
console.log(c.includes("validMoves.push({row:m.toRow,col:m.toCol+1})") ? "   ✅ 选巨将显示4点" : "   ❌ 显示点不足");

// 8. Undo
console.log("\n8. 悔棋兼容:");
console.log(c.includes("giants: giants.map(g => ({ ...g }))") ? "   ✅ 悔棋保存巨将状态" : "   ❌ 悔棋未保存巨将状态");

// Summary
console.log("\n========================================");
console.log("验证完成！");
console.log("========================================");
