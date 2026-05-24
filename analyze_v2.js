const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// Find the click handler - giant move matching section
let clickIdx = c.indexOf("canvas.addEventListener('click'");
let clickEnd = c.indexOf("canvas.addEventListener('mousemove'", clickIdx);
let clickHandler = c.substring(clickIdx, clickEnd);

console.log("=== Click Handler - Giant Related Matches ===");
let lines = clickHandler.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("giant")) {
    console.log("L" + i + ": " + lines[i].trim());
  }
}

// Find the applyMove function
let applyIdx = c.indexOf("function applyMove(move, color)");
let applyEnd = c.indexOf("function autoStep()", applyIdx);
let applyCode = c.substring(applyIdx, applyEnd);

console.log("\n=== ApplyMove - Giant Related ===");
let applyLines = applyCode.split("\n");
for (let i = 0; i < applyLines.length; i++) {
  if (applyLines[i].includes("giant") || applyLines[i].includes("巨将") || applyLines[i].includes("弹飞") || applyLines[i].includes("attacked")) {
    console.log("L" + i + ": " + applyLines[i].trim());
  }
}

// Find undoMove function
let undoIdx = c.indexOf("function undoMove()");
console.log("\n=== UndoMove ===");
if (undoIdx >= 0) {
  console.log(c.substring(undoIdx, undoIdx + 500));
}
