const fs = require("fs");

// Read the backup which is the original modified file (with the first round of changes already applied)
let content = fs.readFileSync("index.html.bak2", "utf8");
console.log("Original size:", content.length);

// ====================================================================
// PHASE 1: Apply ALL changes sequentially on the same string
// ====================================================================

// --- 1. Giant click matching - replace pattern 1 (with spaces) ---
content = content.replace(
  "if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && m.toRow === logicRow && m.toCol === logicCol) return true;",
  "if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && logicRow >= m.toRow && logicRow <= m.toRow+1 && logicCol >= m.toCol && logicCol <= m.toCol+1) return true;"
);
console.log("1. Pattern 1 (spaced) replaced:", content.includes("logicRow >= m.toRow"));

// --- 2. Giant click matching - replace pattern 2 (no spaces) ---
content = content.replace(
  "if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&m.toRow===logicRow&&m.toCol===logicCol) return true;",
  "if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&logicRow>=m.toRow&&logicRow<=m.toRow+1&&logicCol>=m.toCol&&logicCol<=m.toCol+1) return true;"
);
console.log("2. Pattern 2 (nospace) replaced:", content.includes("logicRow>=m.toRow"));

// --- 3. Attacked giant block replacement (knockback) ---
// Find by position
let ifStart = content.indexOf("if (attackedGiant) {");
console.log("ifStart:", ifStart);
let braceStart = content.indexOf("{", ifStart);
let braceCount = 0;
let blockEnd = -1;
for (let i = braceStart; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  else if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      blockEnd = i + 1;
      break;
    }
  }
}
console.log("blockEnd:", blockEnd);

let oldBlock = content.substring(ifStart, blockEnd);
console.log("Old block length:", oldBlock.length);

// Verify old block matches what we expect
console.log("Old block starts with:", JSON.stringify(oldBlock.substring(0, 50)));
console.log("Old block ends with:", JSON.stringify(oldBlock.substring(oldBlock.length - 30)));

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
                // 巨将死亡，攻击棋子留在目标格
                board[move.toRow - ROW_MIN][move.toCol - COL_MIN] = piece;
                board[move.fromRow - ROW_MIN][move.fromCol - COL_MIN] = null;
              } else {
                // 巨将未死：攻击棋子被弹飞
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
                // 沿反方向寻找远离巨将的最近空位
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

content = content.substring(0, ifStart) + newBlock + content.substring(blockEnd);
console.log("3. Knockback replaced in attackedGiant block");

// Verify
console.log("   Has knockback:", content.includes("被弹飞"));

// --- 4. TianJiang giant attack detection ---
let tjPos = content.indexOf("if (move.type === 'tianjiang') {");
console.log("\nTianJiang block at:", tjPos);
let tjBracePos = content.indexOf("{", tjPos);
braceCount = 0;
let tjEnd = -1;
for (let i = tjBracePos; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  else if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) { tjEnd = i + 1; break; }
  }
}
console.log("TianJiang block end:", tjEnd);

let tjBlock = content.substring(tjPos, tjEnd);
console.log("TianJiang block length:", tjBlock.length);

// Find the last board assignment for insertion
let lastBoardIdx = tjBlock.lastIndexOf("board[");
console.log("Last board at relative offset:", lastBoardIdx);

let absInsert = tjPos + lastBoardIdx;
console.log("Absolute insert position:", absInsert);

let giantCheckCode = 
`          // 检查天将攻击巨将
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

content = content.substring(0, absInsert) + giantCheckCode + content.substring(absInsert);
console.log("4. TianJiang giant attack detection inserted");

// Save final
fs.writeFileSync("index.html", content, "utf8");

// ====================================================================
// VERIFY ALL CHANGES
// ====================================================================
console.log("\n=== FINAL VERIFICATION ===");
console.log("1. Click match pattern 1:", content.includes("logicRow >= m.toRow && logicRow <= m.toRow+1 && logicCol >= m.toCol && logicCol <= m.toCol+1") ? "✅" : "❌");
console.log("2. Click match pattern 2:", content.includes("logicRow>=m.toRow&&logicRow<=m.toRow+1&&logicCol>=m.toCol&&logicCol<=m.toCol+1") ? "✅" : "❌");
console.log("3. Knockback (💨):", content.includes("💨") && content.includes("被弹飞") ? "✅" : "❌");
console.log("4. Knockback (dirRow/dirCol):", content.includes("dirRow = vecRow === 0") ? "✅" : "❌");
console.log("5. TJ strong kill (⚔️):", content.includes("⚔️ 天将强杀巨将") ? "✅" : "❌");
console.log("6. TJ normal attack (💢):", content.includes("💢 天将攻击巨将，1点伤害") ? "✅" : "❌");
console.log("7. TJ giant target:", content.includes("tjGiantTarget") ? "✅" : "❌");
console.log("8. TJ strong kill logic:", content.includes("isStrongKill") ? "✅" : "❌");
console.log("\nSize:", content.length);
