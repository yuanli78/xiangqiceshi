const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// Restore from backup
// But first backup the current (with patterns 1+2 applied)
fs.writeFileSync("index.html.step1", c, "utf8");

// Now let's work directly with the string content, finding and replacing
// Use fs.readFileSync with the restored version again, and make all changes
// at once using a single write

// Re-read the original (before any changes)
c = fs.readFileSync("index.html", "utf8");

// ====================================================================
// CHANGE 1: Giant click matching - accept any of 4 cells (2 pattern matches)
// ====================================================================
c = c.replace(
  "if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && m.toRow === logicRow && m.toCol === logicCol) return true;",
  "if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && logicRow >= m.toRow && logicRow <= m.toRow+1 && logicCol >= m.toCol && logicCol <= m.toCol+1) return true;"
);

c = c.replace(
  "if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&m.toRow===logicRow&&m.toCol===logicCol) return true;",
  "if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&logicRow>=m.toRow&&logicRow<=m.toRow+1&&logicCol>=m.toCol&&logicCol<=m.toCol+1) return true;"
);

console.log("✅ Click matching patterns replaced");

// ====================================================================
// CHANGE 2: Normal piece attacks giant → piece gets knocked back
// Find and replace the entire attackedGiant logic
// ====================================================================
// Read the exact old block from the file
let oldBlock = `            if (attackedGiant) {
              attackedGiant.hp--;
              log(\`💢 巨将受创！剩余生命：${attackedGiant.hp}\`, 'warn');
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
              }
              board[move.toRow - ROW_MIN][move.toCol - COL_MIN] = piece;
              board[move.fromRow - ROW_MIN][move.fromCol - COL_MIN] = null;
            } else {`;

// Let me find this block in the file using indexes, not string matching
let searchFrom = c.indexOf("if (attackedGiant)");
// Find the exact boundaries
// The block we want starts at "if (attackedGiant) {" and ends at "} else {"
let ifStart = c.indexOf("if (attackedGiant) {", searchFrom);
if (ifStart < 0) {
  console.log("❌ Could not find 'if (attackedGiant) {'");
  process.exit(1);
}

// Find the matching closing brace for this if statement
// The structure is:
// if (attackedGiant) {
//   hp--;
//   ...
//   if (hp <= 0) { ... }
//   board[...] = piece;
//   board[...] = null;
// } else {
let braceCount = 0;
let foundStart = false;
let blockEnd = -1;
for (let i = ifStart; i < c.length; i++) {
  if (c[i] === '{') { braceCount++; foundStart = true; }
  else if (c[i] === '}') {
    braceCount--;
    if (foundStart && braceCount === 0) {
      // Check if next non-space chars are " else {"
      let nextPart = c.substring(i + 1).replace(/^\s+/, '');
      if (nextPart.startsWith("} else {")) {
        // need another closing brace for the outer else-if
        // Actually let's just find the } else { that follows
        continue;
      }
      blockEnd = i + 1; // include the }
      break;
    }
    if (foundStart && braceCount === 0) {
      blockEnd = i + 1;
      break;
    }
  }
}

if (blockEnd < 0) {
  console.log("❌ Could not find end of attackedGiant block");
  process.exit(1);
}

let oldAttackedBlock = c.substring(ifStart, blockEnd);
console.log("Found attackedGiant block. Length:", oldAttackedBlock.length);
console.log("First 100:", oldAttackedBlock.substring(0, 100));
console.log("Last 100:", oldAttackedBlock.substring(oldAttackedBlock.length - 100));

// Build the new block
let newAttackedBlock = `            if (attackedGiant) {
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
                // 计算向量方向：从巨将中心指向攻击棋子来源
                const gCenterRow = attackedGiant.topLeftRow + 0.5;
                const gCenterCol = attackedGiant.topLeftCol + 0.5;
                const vecRow = fromR - gCenterRow;
                const vecCol = fromC - gCenterCol;
                // 归一化为方向符号
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
                  // 弹回原位，检查原位是否被巨将覆盖
                  const inOrigGiant = fromR >= attackedGiant.topLeftRow && fromR <= attackedGiant.topLeftRow + 1 &&
                                      fromC >= attackedGiant.topLeftCol && fromC <= attackedGiant.topLeftCol + 1;
                  if (!inOrigGiant && !board[fromR - ROW_MIN]?.[fromC - COL_MIN]) {
                    landRow = fromR; landCol = fromC; foundSafe = true;
                  } else {
                    // 螺旋搜索最近空位
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
                // 执行弹飞
                board[toR - ROW_MIN][toC - COL_MIN] = null;
                board[landRow - ROW_MIN][landCol - COL_MIN] = piece;
                board[fromR - ROW_MIN][fromC - COL_MIN] = null;
                log(\`💨 \${piece.name} 被弹飞！\`, 'info');
              }
            } else {`;

// Verify the old block matches
if (c.substring(ifStart, blockEnd) !== oldAttackedBlock) {
  console.log("⚠️ Warning: old block mismatch! Let me check...");
  console.log("File has:", JSON.stringify(c.substring(ifStart, ifStart + 50)));
  console.log("Expected:", JSON.stringify(oldAttackedBlock.substring(0, 50)));
}

c = c.substring(0, ifStart) + newAttackedBlock + c.substring(blockEnd);
console.log("✅ Attacked giant block replaced (with knockback)");

// ====================================================================
// CHANGE 3: TianJiang applyMove - add giant attack detection + strong attack
// ====================================================================
// Find the tianjiang apply section using brace matching
let tjSearchIdx = 0;
let tjMovePos = c.indexOf("else if(move.type==='tianjiang')", tjSearchIdx);

if (tjMovePos < 0) {
  console.log("❌ Could not find tianjiang move type in applyMove");
  process.exit(1);
}

// Find the opening brace
let braceStart = c.indexOf("{", tjMovePos);
// Match braces to find the full block
let braceCount2 = 0;
let tjBlockEnd = -1;
for (let i = braceStart; i < c.length; i++) {
  if (c[i] === '{') braceCount2++;
  else if (c[i] === '}') {
    braceCount2--;
    if (braceCount2 === 0) {
      tjBlockEnd = i + 1;
      break;
    }
  }
}

if (tjBlockEnd < 0) {
  console.log("❌ Could not find end of tianjiang block");
  process.exit(1);
}

let tjFullBlock = c.substring(tjMovePos, tjBlockEnd);
console.log("TianJiang block length:", tjFullBlock.length);
console.log("Last 300 chars:", tjFullBlock.substring(tjFullBlock.length - 300));

// Check if it already has giant attack detection
let hasGiantCheck = tjFullBlock.includes("giant") || tjFullBlock.includes("巨将") || tjFullBlock.includes("topLeftRow");
console.log("Has giant check already:", hasGiantCheck);

if (!hasGiantCheck) {
  // We need to add giant attack detection
  // Find the insertion point: right before the final board cleanup and piece placement
  // Look for the last board[ assignment that places the tianjiang on board
  let lastBoardSet = tjFullBlock.lastIndexOf("board[");
  if (lastBoardSet >= 0) {
    // Convert to absolute position
    let absLastBoardSet = tjMovePos + lastBoardSet;
    let beforeLastSet = c.substring(absLastBoardSet - 200, absLastBoardSet);
    console.log("Before last board set:", beforeLastSet);
    
    // Insert giant attack check before the final board operations
    let giantAttackInsert = `
          // 检查天将攻击巨将
          const tjGiantTarget = giants.find(g =>
            g.color !== color &&
            g.topLeftRow <= move.toRow && g.topLeftRow + 1 >= move.toRow &&
            g.topLeftCol <= move.toLeftCol && g.topLeftCol + 1 >= move.toLeftCol + (tj.isHalved ? 0 : 1)
          );
          if (tjGiantTarget) {
            // 判断是否为纵向强杀：天将的两列与巨将的两列完全重合，行数差为1
            // 天将占据 leftCol 到 rightCol，巨将占据 topLeftCol 到 topLeftCol+1
            let isStrongKill = false;
            if (!tj.isHalved) {
              if (tj.leftCol === tjGiantTarget.topLeftCol && tj.rightCol === tjGiantTarget.topLeftCol + 1) {
                // 列完全重合
                if (Math.abs(tj.row - tjGiantTarget.topLeftRow) === 1 || Math.abs(tj.row - (tjGiantTarget.topLeftRow + 1)) === 1) {
                  isStrongKill = true;
                }
              }
              // 巨将覆盖天将的两格
              if (tjGiantTarget.topLeftRow <= tj.row && tj.row <= tjGiantTarget.topLeftRow + 1 &&
                  tjGiantTarget.topLeftCol <= tj.leftCol && tjGiantTarget.topLeftCol + 1 >= tj.rightCol) {
                isStrongKill = true;
              }
            } else {
              // 半血天将，检查是否在巨将覆盖区域内
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
            // 天将移到目标格（覆盖巨将区域）
            // 这部分由原有代码处理，不变
          }`;
    
    c = c.substring(0, absLastBoardSet) + giantAttackInsert + c.substring(absLastBoardSet);
    console.log("✅ Giant attack detection inserted into tianjiang block");
  }
} else {
  console.log("Skipping - giant check already exists");
}

// Save final result
fs.writeFileSync("index.html", c, "utf8");
console.log("✅ All changes saved to index.html");
