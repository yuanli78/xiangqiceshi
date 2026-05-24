const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// Backup
fs.writeFileSync("index.html.bak2", c, "utf8");
console.log("Backup saved to index.html.bak2");

// ====================================================================
// CHANGE 1: Giant click matching - accept any of 4 cells
// ====================================================================
// Pattern 1: line 70 - enemy piece click
const oldPattern1 = "if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && m.toRow === logicRow && m.toCol === logicCol) return true;";
const newPattern1 = "if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && logicRow >= m.toRow && logicRow <= m.toRow+1 && logicCol >= m.toCol && logicCol <= m.toCol+1) return true;";

if (c.includes(oldPattern1)) {
  c = c.replace(oldPattern1, newPattern1);
  console.log("✅ Pattern 1 replaced (enemy piece click)");
} else {
  console.log("❌ Pattern 1 NOT found!");
}

// Pattern 2: line 179 - empty square click
const oldPattern2 = "if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&m.toRow===logicRow&&m.toCol===logicCol) return true;";
const newPattern2 = "if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&logicRow>=m.toRow&&logicRow<=m.toRow+1&&logicCol>=m.toCol&&logicCol<=m.toCol+1) return true;";

if (c.includes(oldPattern2)) {
  c = c.replace(oldPattern2, newPattern2);
  console.log("✅ Pattern 2 replaced (empty square click)");
} else {
  console.log("❌ Pattern 2 NOT found!");
}

// Also check for pattern in the "hovered tianjiang" section (lines 44-46 and 156-158)
// Those check giant eating tianjiang via m.toRow === tj.row && m.toCol === col
// Those are fine - they check specific tianjiang cell, not general giant movement

// ====================================================================
// CHANGE 2: Normal piece attacks giant → piece gets knocked back
// ====================================================================
// Find the attackedGiant block in applyMove
const oldAttackedGiantBlock = `            if (attackedGiant) {
              attackedGiant.hp--;
              log(` + "`" + `💢 巨将受创！剩余生命：${attackedGiant.hp}` + "`" + `, 'warn');
              if (attackedGiant.hp <= 0) {
                log(` + "`" + `💀 巨将崩毁！` + "`" + `, 'warn');
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

const newAttackedGiantBlock = `            if (attackedGiant) {
              attackedGiant.hp--;
              log(` + "`" + `💢 巨将受创！剩余生命：${attackedGiant.hp}` + "`" + `, 'warn');
              if (attackedGiant.hp <= 0) {
                log(` + "`" + `💀 巨将崩毁！` + "`" + `, 'warn');
                for (let dr = 0; dr < 2; dr++) {
                  for (let dc = 0; dc < 2; dc++) {
                    const ir = attackedGiant.topLeftRow + dr - ROW_MIN, ic = attackedGiant.topLeftCol + dc - COL_MIN;
                    if (ir >= 0 && ir < ROWS && ic >= 0 && ic < COLS) {
                      board[ir][ic] = null;
                    }
                  }
                }
                giants.splice(giants.indexOf(attackedGiant), 1);
                // 巨将死亡时仍把攻击棋子放在目标格（无弹飞）
                board[move.toRow - ROW_MIN][move.toCol - COL_MIN] = piece;
                board[move.fromRow - ROW_MIN][move.fromCol - COL_MIN] = null;
              } else {
                // 巨将未死：攻击棋子被弹飞
                const gCx = (attackedGiant.topLeftRow + attackedGiant.topLeftRow + 1) / 2;
                const gCy = (attackedGiant.topLeftCol + attackedGiant.topLeftCol + 1) / 2;
                // 计算向量方向：从巨将中心指向攻击来源
                const vecRow = move.fromRow - gCx;
                const vecCol = move.fromCol - gCy;
                // 归一化方向（取符号）
                const dirRow = vecRow === 0 ? 0 : (vecRow > 0 ? 1 : -1);
                const dirCol = vecCol === 0 ? 0 : (vecCol > 0 ? 1 : -1);
                // 沿反方向寻找远离巨将的最近空位
                let foundSafe = false;
                let toRow = move.fromRow, toCol = move.fromCol;
                for (let dist = 1; dist <= 6; dist++) {
                  const tryRow = move.fromRow + dirRow * dist;
                  const tryCol = move.fromCol + dirCol * dist;
                  if (tryRow < ROW_MIN || tryRow > ROW_MAX || tryCol < COL_MIN || tryCol > COL_MAX) break;
                  // 检查目标格是否在巨将覆盖的四格内
                  const inGiant = tryRow >= attackedGiant.topLeftRow && tryRow <= attackedGiant.topLeftRow + 1 &&
                                  tryCol >= attackedGiant.topLeftCol && tryCol <= attackedGiant.topLeftCol + 1;
                  if (inGiant) continue;
                  const tgt = board[tryRow - ROW_MIN]?.[tryCol - COL_MIN];
                  if (!tgt) {
                    // 找到空位，检查是否安全（不被敌方威胁）
                    toRow = tryRow;
                    toCol = tryCol;
                    foundSafe = true;
                    break;
                  }
                }
                if (!foundSafe) {
                  // 弹回原位 - 检查原位是否在巨将区域内
                  const inOrigGiant = move.fromRow >= attackedGiant.topLeftRow && move.fromRow <= attackedGiant.topLeftRow + 1 &&
                                      move.fromCol >= attackedGiant.topLeftCol && move.fromCol <= attackedGiant.topLeftCol + 1;
                  if (inOrigGiant) {
                    // 原位被巨将覆盖了，找最近的空位
                    for (let rad = 1; rad <= 4; rad++) {
                      for (let dr2 = -rad; dr2 <= rad; dr2++) {
                        for (let dc2 = -rad; dc2 <= rad; dc2++) {
                          if (Math.abs(dr2) !== rad && Math.abs(dc2) !== rad) continue;
                          const tryRow = move.fromRow + dr2;
                          const tryCol = move.fromCol + dc2;
                          if (tryRow < ROW_MIN || tryRow > ROW_MAX || tryCol < COL_MIN || tryCol > COL_MAX) continue;
                          const inGiant2 = tryRow >= attackedGiant.topLeftRow && tryRow <= attackedGiant.topLeftRow + 1 &&
                                           tryCol >= attackedGiant.topLeftCol && tryCol <= attackedGiant.topLeftCol + 1;
                          if (inGiant2) continue;
                          const tgt = board[tryRow - ROW_MIN]?.[tryCol - COL_MIN];
                          if (!tgt) {
                            toRow = tryRow;
                            toCol = tryCol;
                            foundSafe = true;
                            break;
                          }
                        }
                        if (foundSafe) break;
                      }
                      if (foundSafe) break;
                    }
                  } else {
                    // 原位不在巨将内，可以直接弹回
                    const origTgt = board[move.fromRow - ROW_MIN]?.[move.fromCol - COL_MIN];
                    if (!origTgt) {
                      toRow = move.fromRow;
                      toCol = move.fromCol;
                      foundSafe = true;
                    }
                  }
                }
                board[move.toRow - ROW_MIN][move.toCol - COL_MIN] = null;
                board[toRow - ROW_MIN][toCol - COL_MIN] = piece;
                board[move.fromRow - ROW_MIN][move.fromCol - COL_MIN] = null;
                log(` + "`" + `💨 ${piece.name} 被弹飞！` + "`" + `, 'info');
              }
            } else {`;

if (c.includes(oldAttackedGiantBlock)) {
  c = c.replace(oldAttackedGiantBlock, newAttackedGiantBlock);
  console.log("✅ Attacked giant block replaced (added knockback)");
} else {
  console.log("❌ Old attacked giant block NOT found!");
  // Try to find it with partial match
  let idx = c.indexOf("if (attackedGiant)");
  if (idx >= 0) {
    console.log("Found 'if (attackedGiant)' at", idx);
    console.log("Partial:", c.substring(idx, idx + 350));
  }
}

// ====================================================================
// CHANGE 3: TianJiang strong attack on giant - 2 damage if aligned vertically
// ====================================================================
// The tianjiang attack on giants is NOT yet in the code.
// Currently the giant attack is only in the `} else if (true)` block for pieces.
// We need to add it to the tianjiang attack detection.
// 
// Actually wait - looking more carefully, the tianjiang section handles
// attackedTianJiang (when a piece/tj/giant attacks a tianjiang).
// But a tianjiang attacking a giant... when a tianjiang MOVE targets a giant,
// it would go through the `} else if (true)` block since the move type would 
// be 'tianjiang', not 'piece'. But the attackedGiant check only looks at move.toRow/move.toCol.
// 
// Let me check: how does a tianjiang generate a move that attacks a giant?
// In generateMoves for tianjiang, the move has:
//   {type:'tianjiang', tj:t, toRow:nr, toLeftCol:nc, ...}
// So in applyMove, the else if(move.type==='tianjiang') section handles it.
// But wait - is there a 'tianjiang' move type section?
// Let me check the applyMove code for tianjiang moves...

let tjMoveIdx = c.indexOf("else if(move.type==='tianjiang')");
if (tjMoveIdx >= 0) {
  console.log("\n✅ Found tianjiang move type in applyMove at", tjMoveIdx);
  
  // Get the tianjiang apply block
  let tjBlockStart = c.indexOf("else if(move.type==='tianjiang') {", tjMoveIdx - 20);
  let tjBlockEnd = c.indexOf("}", tjBlockStart);
  let braceCount = 1;
  let pos = c.indexOf("{", tjBlockStart) + 1;
  while (braceCount > 0 && pos < c.length) {
    if (c[pos] === '{') braceCount++;
    if (c[pos] === '}') braceCount--;
    pos++;
  }
  let tjBlock = c.substring(tjBlockStart, pos);
  console.log("TianJiang applyBlock starts:", tjBlock.substring(0, 100));
  console.log("Contains giant check?", tjBlock.includes('giant') || tjBlock.includes('g.topLeftRow'));
  
  // If not, we need to add giant attack detection in the tianjiang section
  if (!tjBlock.includes('giant') && !tjBlock.includes('巨将')) {
    console.log("❌ TianJiang move has no giant attack logic! Need to add it.");
    
    // Find where the tianjiang places itself on the board
    // Look for where it ends up setting board positions and logging
    // We need to add a giant attack check before the final board update
    
    // Let me find the exact insertion point
    let insertIdx = tjBlock.indexOf("log(`");
    if (insertIdx < 0) {
      // Look for the end of tianjiang move processing
      let afterBoardSet = tjBlock.lastIndexOf("board[");
      if (afterBoardSet >= 0) {
        let afterSlice = tjBlock.substring(afterBoardSet);
        console.log("After board set:", afterSlice.substring(0, 200));
      }
    }
    
    // Actually, let me print the FULL tianjiang apply block
    console.log("\nFULL TianJiang apply (first 2000 chars):");
    console.log(tjBlock.substring(0, 2000));
  }
} else {
  console.log("\n❌ No 'tianjiang' move type in applyMove!");
}

// ====================================================================
// Find the tianjiang applyMove section and add giant attack detection
// ====================================================================
// Let me find where tianjiang finishes its logic and print more
let allTJ = c.match(/else if\(move\.type==='tianjiang'\)\s*\{[^}]*\}/);
// Actually let me use a proper brace matching approach
let tianJiangPos = 0;
let searchIdx = 0;
while ((searchIdx = c.indexOf("else if(move.type==='tianjiang')", searchIdx)) >= 0) {
  tianJiangPos = searchIdx;
  searchIdx += 1;
  
  let braceCount2 = 0;
  let start = c.indexOf("{", tianJiangPos);
  for (let p = start; p < c.length; p++) {
    if (c[p] === '{') braceCount2++;
    if (c[p] === '}') {
      braceCount2--;
      if (braceCount2 === 0) {
        let fullBlock = c.substring(tianJiangPos, p + 1);
        console.log("\nTianJiang apply block at", tianJiangPos, "length:", fullBlock.length);
        console.log("First 1000 chars:", fullBlock.substring(0, 1000));
        console.log("...");
        console.log("Last 500 chars:", fullBlock.substring(fullBlock.length - 500));
        break;
      }
    }
  }
}
