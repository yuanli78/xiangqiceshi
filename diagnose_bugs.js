const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// === BUG 1: Find giant's eat logic in applyMove ===
let giantApplyStart = c.indexOf("} else if(move.type==='giant') {");
let giantApplyEnd = c.indexOf("} else {", giantApplyStart);
let giantBlock = c.substring(giantApplyStart, giantApplyEnd);
console.log("=== BUG 1: Giant apply block (first 1500 chars) ===");
console.log(giantBlock.substring(0, 1500));
console.log("\n... (rest) ...\n");
console.log(giantBlock.substring(giantBlock.length - 800));

// === BUG 2: Find the click handler's piece-on-enemy matching logic ===
let clickIdx = c.indexOf("canvas.addEventListener('click'");
let clickSection = c.substring(clickIdx, clickIdx + 8000);
console.log("\n=== BUG 2: Click handler - piece targeting enemy section ===");
let lines = clickSection.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(" selectedPiece") && lines[i].includes("piece") && lines[i].includes("color")) {
    console.log("L" + i + ": " + lines[i].trim());
  }
}

// Find the exact piece-click-enemy block
let enemyClickIdx = c.indexOf("selectedPiece && piece && piece.color !== currentPlayer && piece.name !== '巨将'");
if (enemyClickIdx >= 0) {
  console.log("\nFound enemy click target block at", enemyClickIdx);
  let blockEnd = c.indexOf("}", enemyClickIdx + 300);
  console.log(c.substring(enemyClickIdx - 50, blockEnd + 3));
}

// === BUG 3: Check tianjiang collection in giant eater code ===
console.log("\n=== BUG 3: Check if tianjiang is already collected in giant eater ===");
let eatLoop = giantBlock.indexOf("enemiesUnderGiant.push");
console.log("enemiesUnderGiant.push found at relative offset", eatLoop);
let pushContext = giantBlock.substring(Math.max(0, eatLoop - 300), eatLoop + 300);
console.log(pushContext);

// === Also check the tianjiang section for attackedGiant interception ===
console.log("\n=== Check if attackedGiant path is intercepted by tianjiang ===");
let tianjiangCheckPos = c.indexOf("// 检查是否攻击了巨将（必须在天将处理之后，用 else if 避免同时触发）");
if (tianjiangCheckPos >= 0) {
  let before = c.substring(tianjiangCheckPos - 400, tianjiangCheckPos);
  let after = c.substring(tianjiangCheckPos, tianjiangCheckPos + 400);
  console.log("Before:");
  console.log(before);
  console.log("After:");
  console.log(after);
}
