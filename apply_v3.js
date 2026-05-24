const fs = require("fs");
const c = fs.readFileSync("index.html", "utf8");

// First, restore from step1 (which has click matching done)
// Actually, let's work on the original directly. But the first script already
// partially modified it. Let me restore from the backup.
const bak = fs.readFileSync("index.html.bak2", "utf8");

// Now I'll work on the content using ONLY string operations, no JS template literals.
// All the actual JS template literal code (backticks with ${}) that I need to 
// insert into the HTML file will be built as plain strings.

// ====================================================================
// Start from backup and make all changes
// ====================================================================
let content = bak;

// ====================================================================
// CHANGE 1: Giant click matching (2 patterns)
// ====================================================================
content = content.replace(
  "if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && m.toRow === logicRow && m.toCol === logicCol) return true;",
  "if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && logicRow >= m.toRow && logicRow <= m.toRow+1 && logicCol >= m.toCol && logicCol <= m.toCol+1) return true;"
);

content = content.replace(
  "if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&m.toRow===logicRow&&m.toCol===logicCol) return true;",
  "if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&logicRow>=m.toRow&&logicRow<=m.toRow+1&&logicCol>=m.toCol&&logicCol<=m.toCol+1) return true;"
);

console.log("✅ Change 1: Click matching patterns replaced");

// ====================================================================
// CHANGE 2: Normal piece attacks giant → knockback
// Find the exact attackedGiant block using position-based approach
// ====================================================================
let ifStart = content.indexOf("if (attackedGiant) {");
if (ifStart < 0) {
  console.log("❌ Could not find 'if (attackedGiant) {'");
  process.exit(1);
}

// Find the exact block end by brace matching from this "if"
// We want: if (attackedGiant) { ... hp-- ... if (hp <= 0) { ... } ... board ... } 
// The matching brace for THIS if (attackedGiant) is the one before "} else {"
let braceCount = 0;
let startBrace = content.indexOf("{", ifStart);
let blockEnd = -1;
for (let i = startBrace; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  else if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      blockEnd = i + 1;
      break;
    }
  }
}

let oldBlock = content.substring(ifStart, blockEnd);
console.log("Found attackedGiant block. Length:", oldBlock.length);

// Verify this ends properly (should end with "} else {" somewhere after)
let afterBlock = content.substring(blockEnd, blockEnd + 30);
console.log("After block:", afterBlock.replace(/\n/g, '\\n'));

// The new block - all template literals in the JavaScript code are escaped
// for the Node.js string, but will become actual template literals in the HTML
let newBlock = 
`            if (attackedGiant) {
              attackedGiant.hp--;
              log(\`💢 巨将受创！剩余生命：\${attackedGiant.hp}\`, 'warn');
              if (attackedGiant.hp <= 0) {
                log(\`💀 巨将崩毁！\`, 'warn');
                for (let dr = 0; dr < 2; dr++) {
                  for (let dc = 0; dc < 2; dc++) {
                    const ir = attackedGiant.topLeftRow + dr - ROW_MIN, ic = attackedGiant.topLeftCol + dc - COL_MIN;
                    if (ir >= 0 && ir < ROWS && ic >= 0 && ic < COLS) {
                      board[ir][ic] = null;
                    }
                  }
                }
                giants.splice(giants.indexOf(attackedGiant), 1);
                // \u5de8\u5c06\u6b7b\u4ea1\uff0c\u653b\u51fb\u68cb\u5b50\u7559\u5728\u76ee\u6807\u683c
                board[move.toRow - ROW_MIN][move.toCol - COL_MIN] = piece;
                board[move.fromRow - ROW_MIN][move.fromCol - COL_MIN] = null;
              } else {
                // \u5de8\u5c06\u672a\u6b7b\uff1a\u653b\u51fb\u68cb\u5b50\u88ab\u5f39\u98de
                const fromR = move.fromRow, fromC = move.fromCol;
                const toR = move.toRow, toC = move.toCol;
                const gCenterRow = attackedGiant.topLeftRow + 0.5;
                const gCenterCol = attackedGiant.topLeftCol + 0.5;
                const vecRow = fromR - gCenterRow;
                const vecCol = fromC - gCenterCol;
                const dirRow = vecRow === 0 ? 0 : (vecRow > 0 ? 1 : -1);
                const dirCol = vecCol === 0 ? 0 : (vecCol > 0 ? 1 : -1);
                let foundSafe = false;
                let landRow = fromR, landCol = fromC;
                for (let dist = 1; dist <= 6; dist++) {
                  const tryRow = fromR + dirRow * dist;
                  const tryCol = fromC + dirCol * dist;
                  if (tryRow < ROW_MIN || tryRow > ROW_MAX || tryCol < COL_MIN || tryCol > COL_MAX) break;
                  const inGiant = tryRow >= attackedGiant.topLeftRow && tryRow <= attackedGiant.topLeftRow + 1 &&
                                  tryCol >= attackedGiant.topLeftCol && tryCol <= attackedGiant.topLeftCol + 1;
                  if (inGiant) continue;
                  const tgt = board[tryRow - ROW_MIN]?.[tryCol - COL_MIN];
                  if (!tgt) {
                    landRow = tryRow; landCol = tryCol; foundSafe = true;
                    break;
                  }
                }
                if (!foundSafe) {
                  const inOrigGiant = fromR >= attackedGiant.topLeftRow && fromR <= attackedGiant.topLeftRow + 1 &&
                                      fromC >= attackedGiant.topLeftCol && fromC <= attackedGiant.topLeftCol + 1;
                  if (!inOrigGiant && !board[fromR - ROW_MIN]?.[fromC - COL_MIN]) {
                    landRow = fromR; landCol = fromC; foundSafe = true;
                  } else {
                    for (let rad = 1; rad <= 4 && !foundSafe; rad++) {
                      for (let dr2 = -rad; dr2 <= rad && !foundSafe; dr2++) {
                        for (let dc2 = -rad; dc2 <= rad && !foundSafe; dc2++) {
                          if (Math.abs(dr2) !== rad && Math.abs(dc2) !== rad) continue;
                          const tryRow = fromR + dr2;
                          const tryCol = fromC + dc2;
                          if (tryRow < ROW_MIN || tryRow > ROW_MAX || tryCol < COL_MIN || tryCol > COL_MAX) continue;
                          const inGiant2 = tryRow >= attackedGiant.topLeftRow && tryRow <= attackedGiant.topLeftRow + 1 &&
                                           tryCol >= attackedGiant.topLeftCol && tryCol <= attackedGiant.topLeftCol + 1;
                          if (inGiant2) continue;
                          if (!board[tryRow - ROW_MIN]?.[tryCol - COL_MIN]) {
                            landRow = tryRow; landCol = tryCol; foundSafe = true;
                          }
                        }
                      }
                    }
                  }
                }
                board[toR - ROW_MIN][toC - COL_MIN] = null;
                board[landRow - ROW_MIN][landCol - COL_MIN] = piece;
                board[fromR - ROW_MIN][fromC - COL_MIN] = null;
                log(\`💨 \${piece.name} 被弹飞！\`, 'info');
              }
            } else {`;

// Before replacing, verify oldBlock matches
let actualBlock = content.substring(ifStart, blockEnd);
if (actualBlock !== oldBlock) {
  console.log("⚠️ Content changed during processing. Re-reading...");
  content = bak;
  content = content.replace(
    "if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && m.toRow === logicRow && m.toCol === logicCol) return true;",
    "if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && logicRow >= m.toRow && logicRow <= m.toRow+1 && logicCol >= m.toCol && logicCol <= m.toCol+1) return true;"
  );
  content = content.replace(
    "if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&m.toRow===logicRow&&m.toCol===logicCol) return true;",
    "if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&logicRow>=m.toRow&&logicRow<=m.toRow+1&&logicCol>=m.toCol&&logicCol<=m.toCol+1) return true;"
  );
  ifStart = content.indexOf("if (attackedGiant) {");
  startBrace = content.indexOf("{", ifStart);
  braceCount = 0;
  blockEnd = -1;
  for (let i = startBrace; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) { blockEnd = i + 1; break; }
    }
  }
  oldBlock = content.substring(ifStart, blockEnd);
}
content = content.substring(0, ifStart) + newBlock + content.substring(blockEnd);
console.log("✅ Change 2: Knockback added to attackedGiant");

// ====================================================================
// CHANGE 3: TianJiang strong attack on giant
// Find the tianjiang applyMove section
// ====================================================================
let tjPos = content.indexOf("else if(move.type==='tianjiang') {");
if (tjPos < 0) {
  console.log("❌ Could not find tianjiang apply block");
  process.exit(1);
}

let tjBraceStart = content.indexOf("{", tjPos);
let braceCount3 = 0;
let tjEnd = -1;
for (let i = tjBraceStart; i < content.length; i++) {
  if (content[i] === '{') braceCount3++;
  else if (content[i] === '}') {
    braceCount3--;
    if (braceCount3 === 0) { tjEnd = i + 1; break; }
  }
}
let tjBlock = content.substring(tjPos, tjEnd);
console.log("TianJiang block length:", tjBlock.length);
console.log("Last 400 chars:", tjBlock.substring(tjBlock.length - 400));

// Find the last board[ assignment in the tianjiang block (relative to tjPos)
let lastBoardIdx = tjBlock.lastIndexOf("board[");
if (lastBoardIdx < 0) {
  console.log("❌ No board assignment in tianjiang block");
  process.exit(1);
}

let absInsertPos = tjPos + lastBoardIdx;

// Build the giant attack check code with proper escaping
let tjGiantCode = 
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
              log(\`⚔️ 天将强杀巨将！2点伤害！\`, 'warn');
            } else {
              tjGiantTarget.hp--;
              log(\`💢 天将攻击巨将，1点伤害\`, 'warn');
            }
            if (tjGiantTarget.hp <= 0) {
              log(\`💀 巨将崩毁！\`, 'warn');
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
content = content.substring(0, absInsertPos) + tjGiantCode + content.substring(absInsertPos);
console.log("✅ Change 3: TianJiang giant attack detection added");

// Save final
fs.writeFileSync("index.html", content, "utf8");
console.log("✅ All changes saved to index.html");
