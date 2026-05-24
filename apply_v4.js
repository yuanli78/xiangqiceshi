const fs = require("fs");

// Read the current file (which already has changes 1 and 2)
let content = fs.readFileSync("index.html", "utf8");

// ====================================================================
// CHANGE 3: TianJiang applyMove - add giant attack detection with strong attack
// Find: if (move.type === 'tianjiang') { ... }
// ====================================================================
let tjPos = content.indexOf("if (move.type === 'tianjiang') {");
if (tjPos < 0) {
  console.log("❌ Could not find 'if (move.type === 'tianjiang') {'");
  process.exit(1);
}

// Find the full brace block
let braceStart = content.indexOf("{", tjPos);
let braceCount = 0;
let tjEnd = -1;
for (let i = braceStart; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  else if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) { tjEnd = i + 1; break; }
  }
}

let tjBlock = content.substring(tjPos, tjEnd);
console.log("TianJiang block length:", tjBlock.length);
console.log("Last 400 chars:", tjBlock.substring(tjBlock.length - 400));

// Check if giant detection already exists
if (tjBlock.includes("tjGiantTarget")) {
  console.log("⚠️ TianJiang giant attack already exists, skipping");
} else {
  // Find the last board[ assignment before the end of the block
  // This is where we insert the giant attack check
  let lastBoardIdx = tjBlock.lastIndexOf("board[");
  if (lastBoardIdx < 0) {
    console.log("❌ No board assignment in tianjiang block");
    process.exit(1);
  }
  
  let absInsertPos = tjPos + lastBoardIdx;
  let contextBefore = content.substring(absInsertPos - 200, absInsertPos);
  console.log("Context before insert point:", contextBefore.substring(contextBefore.length - 100));

  // Build the giant detection code
  // Use Unicode escapes for Chinese characters in JS strings
  // But the actual code being inserted should have real Chinese
  let giantCheckCode = 
`          // \u68c0\u67e5\u5929\u5c06\u653b\u51fb\u5de8\u5c06
          const tjGiantTarget = giants.find(g =>
            g.color !== color &&
            g.topLeftRow <= move.toRow && g.topLeftRow + 1 >= move.toRow &&
            g.topLeftCol <= move.toLeftCol && g.topLeftCol + 1 >= move.toLeftCol + (tj.isHalved ? 0 : 1)
          );
          if (tjGiantTarget) {
            let isStrongKill = false;
            if (!tj.isHalved) {
              if (tj.leftCol === tjGiantTarget.topLeftCol && tj.rightCol === tjGiantTarget.topLeftCol + 1) {
                if (Math.abs(tj.row - tjGiantTarget.topLeftRow) === 1 || Math.abs(tj.row - (tjGiantTarget.topLeftRow + 1)) === 1) {
                  isStrongKill = true;
                }
              }
              if (tjGiantTarget.topLeftRow <= tj.row && tj.row <= tjGiantTarget.topLeftRow + 1 &&
                  tjGiantTarget.topLeftCol <= tj.leftCol && tjGiantTarget.topLeftCol + 1 >= tj.rightCol) {
                isStrongKill = true;
              }
            } else {
              if (tjGiantTarget.topLeftRow <= tj.row && tj.row <= tjGiantTarget.topLeftRow + 1 &&
                  tjGiantTarget.topLeftCol <= tj.leftCol && tj.leftCol <= tjGiantTarget.topLeftCol + 1) {
                isStrongKill = true;
              }
            }
            if (isStrongKill) {
              tjGiantTarget.hp -= 2;
              log(\`⚔️ \u5929\u5c06\u5f3a\u6740\u5de8\u5c06\uff012\u70b9\u4f24\u5bb3\uff01\`, 'warn');
            } else {
              tjGiantTarget.hp--;
              log(\`💢 \u5929\u5c06\u653b\u51fb\u5de8\u5c06\uff0c1\u70b9\u4f24\u5bb3\`, 'warn');
            }
            if (tjGiantTarget.hp <= 0) {
              log(\`💀 \u5de8\u5c06\u5d29\u6bc1\uff01\`, 'warn');
              for (let dr = 0; dr < 2; dr++) {
                for (let dc = 0; dc < 2; dc++) {
                  const ir = tjGiantTarget.topLeftRow + dr - ROW_MIN, ic = tjGiantTarget.topLeftCol + dc - COL_MIN;
                  if (ir >= 0 && ir < ROWS && ic >= 0 && ic < COLS) {
                    board[ir][ic] = null;
                  }
                }
              }
              giants.splice(giants.indexOf(tjGiantTarget), 1);
            }
          }
`;

  content = content.substring(0, absInsertPos) + giantCheckCode + content.substring(absInsertPos);
  console.log("✅ TianJiang giant attack detection inserted at position", absInsertPos);
}

// Save
fs.writeFileSync("index.html", content, "utf8");
console.log("✅ All changes saved!");
