const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// Search for all "else if(move.type===" variants
let idx = 0;
while ((idx = c.indexOf("else if(move.type===", idx)) >= 0) {
  let end = c.indexOf("\n", idx);
  console.log(c.substring(idx, Math.min(idx + 80, end)));
  idx += 1;
}

console.log("\n--- Searching for 'tianjiang' in applyMove ---");
let applyIdx = c.indexOf("function applyMove(move, color)");
let applyEnd = c.indexOf("function autoStep()", applyIdx);
let applySection = c.substring(applyIdx, applyEnd);

let lines = applySection.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("tianjiang") || lines[i].includes("天将")) {
    console.log("L" + i + ": " + lines[i].trim());
  }
}
