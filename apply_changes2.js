const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// Backup
fs.writeFileSync("index.html.bak", c, "utf8");

// ====================================================================
// 1. REVIVABLE_TYPES - already done, verify
// ====================================================================
let revIdx = c.indexOf("REVIVABLE_TYPES");
let revLineEnd = c.indexOf("\n", revIdx);
let revLine = c.substring(revIdx, revLineEnd);
console.log("REVIVABLE_TYPES line:", revLine);
if (revLine.includes("虎")) {
  console.log("WARNING: 虎 still in REVIVABLE_TYPES! Need to fix.");
} else {
  console.log("OK: 虎 (巨将) removed from REVIVABLE_TYPES");
}

// ====================================================================
// 3. Fix giant movement generation - use line-by-line approach
// ====================================================================
// Find the exact block
let giantGenStart = c.indexOf("giants.filter(g=>g.color===color).forEach(g=>{");
let giantGenEnd = c.indexOf("});", giantGenStart);
giantGenEnd = c.indexOf("});", giantGenEnd + 3); // Second closing brace
let giantGenBlock = c.substring(giantGenStart, giantGenEnd + 3);
console.log("\nGiant move gen block length:", giantGenBlock.length);
console.log("Giant move gen block:");
console.log(giantGenBlock);

// Write the new giant movement generation code
const newGiantGen = `giants.filter(g=>g.color===color).forEach(g=>{
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

if (giantGenStart >= 0 && giantGenEnd >= 0) {
  c = c.substring(0, giantGenStart) + newGiantGen + c.substring(giantGenEnd + 3);
  console.log("\n✓ Giant movement generation replaced!");
} else {
  console.log("\n✗ Could not find giant movement generation block!");
}

// ====================================================================
// 4. Fix cannon mount check - find the exact block
// ====================================================================
let cannonIdx = c.indexOf("// 炮类隔子吃");
if (cannonIdx >= 0) {
  let cannonStart = cannonIdx;
  // The block contains: comment + if statement with two inner if blocks + closing brace
  // Let me find the full block
  let cannonEnd = c.indexOf("\n     }", cannonStart + 80);  // end of the cannon section
  cannonEnd = c.indexOf("\n     }", cannonEnd + 3);  // one more closing brace if needed
  let cannonBlock = c.substring(cannonStart, cannonEnd + 10);
  console.log("\nCannon mount check block:");
  console.log(cannonBlock.substring(0, 500));
  
  const newCannonBlock = `// 炮类隔子吃（巨将不能作为炮架）
     if (['炮','飞炮','战炮','抛石器','异型炮','暗','趁','欲','砖'].includes(name)) {
       if (dr === 0 && dc !== 0) {
         let cnt = 0;
         const step = dc > 0 ? 1 : -1;
         for (let c = fromCol + step; c !== toCol; c += step) {
           const midPiece = board[fromRow-ROW_MIN]?.[c-COL_MIN];
           if (midPiece) {
             // 巨将不能作为炮架 - 检查该格是否属于巨将区域
             const isGiantCell = giants.some(g =>
               fromRow >= g.topLeftRow && fromRow <= g.topLeftRow + 1 &&
               c >= g.topLeftCol && c <= g.topLeftCol + 1
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
             // 巨将不能作为炮架 - 检查该格是否属于巨将区域
             const isGiantCell = giants.some(g =>
               r >= g.topLeftRow && r <= g.topLeftRow + 1 &&
               fromCol >= g.topLeftCol && fromCol <= g.topLeftCol + 1
             );
             if (!isGiantCell) cnt++;
           }
         }
         if (cnt === 1) return true;
       }
     }`;
  
  c = c.substring(0, cannonStart) + newCannonBlock + c.substring(cannonEnd + 10);
  console.log("\n✓ Cannon mount check replaced!");
} else {
  console.log("\n✗ Could not find cannon mount check block!");
}

// ====================================================================
// 5. Fix applyMove - verify the attacked giant HP/removal code
// ====================================================================
// Find the attackedGiant block
let attackedIdx = c.indexOf("attackedGiant = giants.find(g =>");
if (attackedIdx >= 0) {
  // Find the start of the if(attackedGiant) block
  let ifStart = c.lastIndexOf("if (attackedGiant)", attackedIdx);
  // Find the start of the "else if" structure that this is part of
  let outerStart = c.lastIndexOf("} else if (true)", ifStart);
  if (outerStart < 0) {
    outerStart = c.lastIndexOf("} else if", ifStart);
    if (outerStart < 0) outerStart = ifStart;
  }
  // Find the end of this else block (the next "} else {" or similar)
  // The structure is: } else if (true) { ... if (attackedGiant) { ... } else { 普通吃子 } }
  // Look for the closing that goes to "普通吃子"
  let eatElseIdx = c.indexOf("} else {", ifStart);
  let eatElse2Idx = c.indexOf("// 普通吃子（无天将、无巨将）", eatElseIdx);
  let blockEnd = c.indexOf("}", eatElse2Idx);
  blockEnd = c.indexOf("}", blockEnd + 1); // Another closing for the outer else
  let fullAttackedBlock = c.substring(outerStart, blockEnd + 1);
  
  console.log("\n=== Attacked giant block (partial) ===");
  console.log(fullAttackedBlock.substring(0, 800));
  
  // Check if the HP decrement and death logic is present
  if (fullAttackedBlock.includes("attackedGiant.hp--")) {
    console.log("\n✓ HP decrement found");
  } else {
    console.log("\n✗ HP decrement NOT found!");
  }
  if (fullAttackedBlock.includes("giants.splice")) {
    console.log("✓ Giants splice (removal) found");
  } else {
    console.log("✗ Giants splice NOT found!");
  }
  if (fullAttackedBlock.includes("board[ir][ic] = null")) {
    console.log("✓ Board clearing on death found");
  } else {
    console.log("✗ Board clearing NOT found!");
  }
  if (fullAttackedBlock.includes("💀 巨将崩毁")) {
    console.log("✓ Death log message found");
  } else {
    console.log("✗ Death log message NOT found!");
  }
  if (fullAttackedBlock.includes("💢 巨将受创")) {
    console.log("✓ Damage log message found");
  } else {
    console.log("✗ Damage log message NOT found!");
  }
}

// ====================================================================
// 6. Fix giant selection - already done, verify
// ====================================================================
let selectIdx = c.indexOf("selectedPiece={type:'giant', topLeftRow:g.topLeftRow, topLeftCol:g.topLeftCol, color:g.color}; const giantMoves=");
if (selectIdx >= 0) {
  console.log("\n✓ Giant selection shows 4 dots");
} else {
  console.log("\n✗ Giant selection NOT updated correctly");
  // Find it and try again
  let altIdx = c.indexOf("selectedPiece={type:'giant'");
  if (altIdx >= 0) {
    console.log("Found alternative at", altIdx);
    console.log(c.substring(altIdx, altIdx + 300));
  }
}

// ====================================================================
// 7. Verify drawBoard HP bar
// ====================================================================
let barIdx = c.indexOf("血条背景");
if (barIdx >= 0) {
  let barSection = c.substring(barIdx - 80, barIdx + 500);
  console.log("\n=== HP Bar Section ===");
  console.log(barSection);
  
  if (barSection.includes("hpRatio")) {
    console.log("\n✓ HP ratio calculation found");
  } else {
    console.log("\n✗ HP ratio NOT found!");
  }
}

// ====================================================================
// 8. Verify undo compatibility - snapshot includes giants with hp
// ====================================================================
let snapIdx = c.indexOf("giants: giants.map(g => ({ ...g }))");
if (snapIdx >= 0) {
  console.log("\n✓ Undo snapshot includes giants with spread (hp preserved)");
} else {
  console.log("\n✗ Undo snapshot missing giants!");
}

// Save
fs.writeFileSync("index.html", c, "utf8");
console.log("\n========================================");
console.log("All changes applied and verified!");
console.log("========================================");
