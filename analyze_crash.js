const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// 1. Find all try...catch blocks to see error handling
let tryIdx = 0;
console.log("=== try...catch blocks ===");
while ((tryIdx = c.indexOf("try {", tryIdx)) >= 0) {
  let catchIdx = c.indexOf("catch", tryIdx);
  let endLine = c.indexOf("\n", catchIdx);
  console.log("try at", tryIdx, "->", c.substring(catchIdx, Math.min(endLine, catchIdx + 100)));
  tryIdx = catchIdx + 1;
}

// 2. Find the applyMove function and check the giant section
let applyIdx = c.indexOf("function applyMove(move, color)");
let applyEnd = c.indexOf("function autoStep()", applyIdx);
let applyCode = c.substring(applyIdx, applyEnd);
console.log("\n=== ApplyMove giant section ===");
let giantStart = applyCode.indexOf("} else if(move.type==='giant') {");
let giantEnd = applyCode.indexOf("} else {", giantStart);
console.log(applyCode.substring(giantStart, giantEnd));

console.log("\n=== ApplyMove else branch (piece moves) ===");
let elseBranch = applyCode.substring(giantEnd);
console.log(elseBranch.substring(0, 2000));

// 3. Check the generateMoves function for any issues
let genIdx = c.indexOf("function generateMoves(color)");
let genEnd = c.indexOf("function evaluateMove", genIdx);
let genCode = c.substring(genIdx, genEnd);

// Check for 测试 piece references that might cause issues
console.log("\n=== Check for 测试 piece in generateMoves ===");
let testIdx = genCode.indexOf("测试");
if (testIdx >= 0) {
  let contextStart = Math.max(0, testIdx - 100);
  let contextEnd = Math.min(genCode.length, testIdx + 300);
  console.log(genCode.substring(contextStart, contextEnd));
}

// 4. Check the click handler giant targeting code we added
console.log("\n=== Click handler - isGiantCell section ===");
let isGiantIdx = c.indexOf("isGiantCell");
if (isGiantIdx >= 0) {
  let endBracket = c.indexOf("}\n", isGiantIdx);
  console.log(c.substring(isGiantIdx - 200, endBracket + 5));
}
