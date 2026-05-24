const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");
const original = c;

// ====================================================================
// 1. Remove '巨将' from REVIVABLE_TYPES
// ====================================================================
c = c.replace(
  "REVIVABLE_TYPES = ['车','马','炮','驼','骡','麒','飞车','战车','飞马','战马','飞炮','战炮','抛石器','悬','翔','追','截','轰','虎'];",
  "REVIVABLE_TYPES = ['车','马','炮','驼','骡','麒','飞车','战车','飞马','战马','飞炮','战炮','抛石器','悬','翔','追','截','轰'];"
);
console.log("1. Removed '虎'(巨将) from REVIVABLE_TYPES");

// ====================================================================
// 2. Giants already have hp: 4 - verified. No change needed.
// ====================================================================
console.log("2. Giants init has hp: 4 already - OK");

// ====================================================================
// 3. Fix giant movement rules - add check for own pieces in target area
// ====================================================================
const oldGiantMoveGen = `giants.filter(g=>g.color===color).forEach(g=>{
        for(let dr=-2; dr<=2; dr+=2) for(let dc=-2; dc<=2; dc+=2) {
          if(dr===0 && dc===0) continue;
          const nr=g.topLeftRow+dr, nc=g.topLeftCol+dc;
          if(nr<ROW_MIN||nr+1>ROW_MAX||nc<COL_MIN||nc+1>COL_MAX) continue;
          // 巨将不能踏上任何桥格
          if (isBridge(nr, nc) || isBridge(nr, nc+1) || isBridge(nr+1, nc) || isBridge(nr+1, nc+1)) continue;
          // 计算巨将移动后覆盖的四个格子中敌方棋子数量
          let enemyCount = 0;
          for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
              const tr = nr + dr, tc = nc + dc;
              if (tr < ROW_MIN || tr > ROW_MAX || tc < COL_MIN || tc > COL_MAX) continue;
              const tp = board[tr - ROW_MIN]?.[tc - COL_MIN];
              if (tp && tp.color !== color) enemyCount++;
            }
          }
          const canEatGiant = enemyCount > 0 && enemyCount <= 3;
          moves.push({type:'giant', giant:g, toRow:nr, toCol:nc, isEat: canEatGiant, pieceName:'巨将'});
        }
      });`;

const newGiantMoveGen = `giants.filter(g=>g.color===color).forEach(g=>{
        for(let dr=-2; dr<=2; dr+=2) for(let dc=-2; dc<=2; dc+=2) {
          if(dr===0 && dc===0) continue;
          const nr=g.topLeftRow+dr, nc=g.topLeftCol+dc;
          if(nr<ROW_MIN||nr+1>ROW_MAX||nc<COL_MIN||nc+1>COL_MAX) continue;
          // 巨将不能踏上任何桥格（检查四角）
          if (isBridge(nr, nc) || isBridge(nr, nc+1) || isBridge(nr+1, nc) || isBridge(nr+1, nc+1)) continue;
          // 检查目标四格内是否有己方棋子
          let hasOwnPiece = false;
          for (let dr2 = 0; dr2 < 2 && !hasOwnPiece; dr2++) {
            for (let dc2 = 0; dc2 < 2 && !hasOwnPiece; dc2++) {
              const tr = nr + dr2, tc = nc + dc2;
              const tp = board[tr - ROW_MIN]?.[tc - COL_MIN];
              if (tp && tp.color === color) hasOwnPiece = true;
              if (tianJiangs.some(tj => tj.color === color && tj.row === tr && (tj.leftCol === tc || tj.rightCol === tc))) hasOwnPiece = true;
              if (stackedDancers.some(d => d.color === color && d.row === tr && d.col === tc)) hasOwnPiece = true;
            }
          }
          if (hasOwnPiece) continue;
          // 计算巨将移动后覆盖的四格内敌方棋子数量
          let enemyCount = 0;
          for (let dr2 = 0; dr2 < 2; dr2++) {
            for (let dc2 = 0; dc2 < 2; dc2++) {
              const tr = nr + dr2, tc = nc + dc2;
              const tp = board[tr - ROW_MIN]?.[tc - COL_MIN];
              if (tp && tp.color !== color) enemyCount++;
              // 敌方天将也算
              if (tianJiangs.some(tj => tj.color !== color && tj.row === tr && (tj.leftCol === tc || tj.rightCol === tc))) enemyCount++;
            }
          }
          const canEatGiant = enemyCount > 0;
          moves.push({type:'giant', giant:g, toRow:nr, toCol:nc, isEat: canEatGiant, pieceName:'巨将'});
        }
      });`;

if (c.includes(oldGiantMoveGen)) {
  c = c.replace(oldGiantMoveGen, newGiantMoveGen);
  console.log("3. Updated giant movement generation - own piece check added");
} else {
  console.log("3. WARNING: Could not find exact giant move gen block");
  // Try to find it with partial match
  let idx = c.indexOf("giants.filter(g=>g.color===color).forEach(g=>{");
  console.log("   Found at index:", idx);
  console.log("   Context:", c.substring(idx, idx + 80));
}

// ====================================================================
// 4. Fix cannon eating - ensure cannons don't use giants as mounts (炮架)
// ====================================================================
// The cannon mount check is in canPieceAttackCell function (line ~584 in original)
// We need to modify it so that when counting intervening pieces for cannons,
// it skips giant positions
const oldCannonMountCheck = `// 炮类隔子吃
     if (['炮','飞炮','战炮','抛石器','异型炮','暗','趁','欲','砖'].includes(name)) {
       if (dr === 0 && dc !== 0) {
         let cnt = 0;
         const step = dc > 0 ? 1 : -1;
         for (let c = fromCol + step; c !== toCol; c += step) {
           if (board[fromRow-ROW_MIN]?.[c-COL_MIN]) cnt++;
         }
         if (cnt === 1) return true;
       }
       if (dc === 0 && dr !== 0) {
         let cnt = 0;
         const step = dr > 0 ? 1 : -1;
         for (let r = fromRow + step; r !== toRow; r += step) {
           if (board[r-ROW_MIN]?.[fromCol-COL_MIN]) cnt++;
         }
         if (cnt === 1) return true;
       }
     }`;

const newCannonMountCheck = `// 炮类隔子吃（巨将不能作为炮架）
     if (['炮','飞炮','战炮','抛石器','异型炮','暗','趁','欲','砖'].includes(name)) {
       if (dr === 0 && dc !== 0) {
         let cnt = 0;
         const step = dc > 0 ? 1 : -1;
         for (let c = fromCol + step; c !== toCol; c += step) {
           const midPiece = board[fromRow-ROW_MIN]?.[c-COL_MIN];
           if (midPiece) {
             // 巨将不能作为炮架 - 检查该格是否属于巨将
             const isGiantCell = giants.some(g =>
               g.topLeftRow <= fromRow && fromRow <= g.topLeftRow + 1 &&
               g.topLeftCol <= c && c <= g.topLeftCol + 1
             );
             if (!isGiantCell) cnt++;
           }
         }
         if (cnt === 1) return true;
       }
       if (dc === 0 && dr !== 0) {
         let cnt = 0;
         const step = dr > 0 ? 1 : -1;
         for (let r = fromRow + step; r !== toRow; r += step) {
           const midPiece = board[r-ROW_MIN]?.[fromCol-COL_MIN];
           if (midPiece) {
             // 巨将不能作为炮架 - 检查该格是否属于巨将
             const isGiantCell = giants.some(g =>
               g.topLeftRow <= r && r <= g.topLeftRow + 1 &&
               g.topLeftCol <= fromCol && fromCol <= g.topLeftCol + 1
             );
             if (!isGiantCell) cnt++;
           }
         }
         if (cnt === 1) return true;
       }
     }`;

if (c.includes(oldCannonMountCheck)) {
  c = c.replace(oldCannonMountCheck, newCannonMountCheck);
  console.log("4. Updated cannon mount check - giants cannot be used as mounts");
} else {
  console.log("4. WARNING: Could not find exact cannon mount check block");
}

// ====================================================================
// 5. Fix applyMove giant handling - ensure HP system works correctly
// The existing code looks correct, but let me verify and enhance the
// giant attack/remove logic
// ====================================================================

// Find and verify the attackedGiant section
let idx = c.indexOf("attackedGiant");
if (idx >= 0) {
  console.log("5. attackedGiant section found at index:", idx);
  console.log("   Context:", c.substring(idx - 50, idx + 300));
}

// ====================================================================
// 6. Fix giant selection in click handler - show 4 dots for 2x2 area
// ====================================================================
const oldGiantSelect = "selectedPiece={type:'giant', topLeftRow:g.topLeftRow, topLeftCol:g.topLeftCol, color:g.color}; validMoves=generateMoves(currentPlayer).filter(m=>m.type==='giant'&&m.giant.topLeftRow===g.topLeftRow&&m.giant.topLeftCol===g.topLeftCol).map(m=>({row:m.toRow,col:m.toCol})); dangerMoves=[]; drawBoard(); r";

const newGiantSelect = "selectedPiece={type:'giant', topLeftRow:g.topLeftRow, topLeftCol:g.topLeftCol, color:g.color}; const giantMoves=generateMoves(currentPlayer).filter(m=>m.type==='giant'&&m.giant.topLeftRow===g.topLeftRow&&m.giant.topLeftCol===g.topLeftCol); validMoves=[]; giantMoves.forEach(m=>{validMoves.push({row:m.toRow,col:m.toCol});validMoves.push({row:m.toRow,col:m.toCol+1});validMoves.push({row:m.toRow+1,col:m.toCol});validMoves.push({row:m.toRow+1,col:m.toCol+1});}); dangerMoves=[]; drawBoard(); r";

if (c.includes(oldGiantSelect)) {
  c = c.replace(oldGiantSelect, newGiantSelect);
  console.log("6. Updated giant selection to show 4 dots");
} else {
  console.log("6. WARNING: Could not find exact giant selection block");
  console.log("   Trying alternative search...");
  // The ; might be different - let me try a shorter match
  let si = c.indexOf("selectedPiece={type:'giant'");
  if (si >= 0) {
    let ei = c.indexOf("drawBoard();", si);
    let block = c.substring(si, ei + 12);
    console.log("   Found block:", block.substring(0, 150));
  }
}

// ====================================================================
// 7. Verify and enhance the attackedGiant HP/removal logic
// ====================================================================
// Check the current attackedGiant code more thoroughly
let attackedIdx = c.indexOf("attackedGiant");
if (attackedIdx >= 0) {
  // Find the full code block
  let blockStart = c.lastIndexOf("if (attackedGiant)", attackedIdx);
  let blockEnd = c.indexOf("} else {", blockStart);
  let fullBlock = c.substring(blockStart, blockEnd);
  console.log("7. Attacked giant block:");
  console.log(fullBlock);
  
  // Check if the code properly removes giants and clears board
  if (fullBlock.includes("giants.splice")) {
    console.log("   ✓ Has giants splice (removal)");
  } else {
    console.log("   WARNING: Missing giants splice!");
  }
  if (fullBlock.includes("board[ir][ic] = null")) {
    console.log("   ✓ Has board clearing on death");
  } else {
    console.log("   WARNING: Missing board clearing on death!");
  }
}

// ====================================================================
// 8. ApplyMove: In the else branch (after attackedGiant check),
// the "普通吃子（无天将、无巨将）" section.
// We need to verify the giant clearing code is correct.
// Let me also check the HP display.
// ====================================================================

// Verify drawBoard giant HP bar
let barIdx = c.indexOf("血条背景");
if (barIdx >= 0) {
  console.log("8. HP bar drawing code found");
  let barEnd = c.indexOf("\n", barIdx + 200);
  console.log(c.substring(barIdx - 50, barEnd));
}

// Write the modified file
fs.writeFileSync("index.html", c, "utf8");
console.log("\n========================================");
console.log("Modifications complete! File saved.");
console.log("========================================");
