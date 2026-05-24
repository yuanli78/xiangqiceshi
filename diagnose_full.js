const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// Print the full applyMove else branch (piece moves) 
let applyIdx = c.indexOf("function applyMove(move, color)");
let applyEnd = c.indexOf("function autoStep()", applyIdx);
let applyCode = c.substring(applyIdx, applyEnd);

// Find the piece moves section (after giant section)
let elseIdx = applyCode.indexOf("\n        } else {");
let elseSection = applyCode.substring(elseIdx);
console.log("=== FULL else branch (piece moves) ===");
console.log(elseSection.substring(0, 3000));

// Check: does the giant section have all comments properly?
console.log("\n\n=== Check giant section ending ===");
let giantElseIdx = applyCode.indexOf("} else if(move.type==='giant') {");
let giantSectionEnd = applyCode.indexOf("} else {", giantElseIdx);
let giantSection = applyCode.substring(giantElseIdx, giantSectionEnd);
console.log("Last 500 chars of giant section:");
console.log(giantSection.substring(giantSection.length - 500));

// Check the click handler's isGiantCell addition
console.log("\n\n=== Click handler - isGiantCell ===");
let clickIdx = c.indexOf("canvas.addEventListener('click'");
let clickEnd = c.indexOf("canvas.addEventListener('mousemove'", clickIdx);
let clickSection = c.substring(clickIdx, clickEnd);
let igcIdx = clickSection.indexOf("isGiantCell") + clickIdx;
console.log("Found at", igcIdx - clickIdx, "relative to click handler start");
// Find the full block
let blockStart = c.lastIndexOf("// 如果已选中己方棋子", igcIdx - clickIdx);
let blockEnd = c.indexOf("// 同时修正现有条件", igcIdx - clickIdx);
console.log(c.substring(blockStart, blockEnd + 50));

// Check the tianjiang within applyMove
console.log("\n\n=== TianJiang apply section ===");
let tjApplyIdx = c.indexOf("if (move.type === 'tianjiang') {");
let braceCount = 0;
let startBrace = c.indexOf("{", tjApplyIdx);
let tjEnd = -1;
for (let i = startBrace; i < c.length; i++) {
  if (c[i] === '{') braceCount++;
  else if (c[i] === '}') {
    braceCount--;
    if (braceCount === 0) { tjEnd = i + 1; break; }
  }
}
let tjApplyBlock = c.substring(tjApplyIdx, tjEnd);
// Check if it has giant attack detection
console.log("Has tjGiantTarget:", tjApplyBlock.includes("tjGiantTarget"));
