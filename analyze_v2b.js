const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// Find applyMove giant section - get the FULL block
let applyIdx = c.indexOf("function applyMove(move, color)");
let applyEnd = c.indexOf("function autoStep()", applyIdx);
let applyCode = c.substring(applyIdx, applyEnd);
console.log("=== FULL applyMove giant section ===");
let giantStart = applyCode.indexOf("} else if(move.type==='giant') {");
let giantEnd = applyCode.indexOf("} else {", giantStart);
console.log(applyCode.substring(giantStart, giantEnd));

console.log("\n\n=== Giant death/removal section ===");
let deathStart = applyCode.indexOf("if (attackedGiant.hp <= 0)", giantStart);
let deathEnd = applyCode.indexOf("board[move.toRow", deathStart);
console.log(applyCode.substring(deathStart, deathEnd));

console.log("\n\n=== After attackedGiant block (the else branch) ===");
let elseStart = applyCode.indexOf("} else {", giantEnd);
let elseEnd = applyCode.indexOf("// 普通吃子（无天将、无巨将）", elseStart);
console.log(applyCode.substring(elseStart, elseEnd));
