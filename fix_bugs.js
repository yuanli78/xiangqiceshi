const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");
fs.writeFileSync("index.html.bak3", c, "utf8");
console.log("Backup saved");

// ====================================================================
// BUG 1: Giant crushing should also eat tianjiangs
// ====================================================================
// Find the giant apply block: the enemiesUnderGiant collection loop
// We need to add tianjiang detection AFTER the board loop

let giantApplyStart = c.indexOf("} else if(move.type==='giant') {");
let giantApplyEnd = c.indexOf("} else {", giantApplyStart);
let oldGiantBlock = c.substring(giantApplyStart, giantApplyEnd);

// Find the specific section to replace
// The section where enemiesUnderGiant is collected
let eatStart = c.indexOf("const enemiesUnderGiant = [];", giantApplyStart);
let eatEnd = c.indexOf("// 吃子：如果敌方棋子数量<=3", eatStart);
let oldEatSection = c.substring(eatStart, eatEnd);

let newEatSection = 
`          const enemiesUnderGiant = [];
          for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
              const tr = g.topLeftRow + dr, tc = g.topLeftCol + dc;
              if (tr < ROW_MIN || tr > ROW_MAX || tc < COL_MIN || tc > COL_MAX) continue;
              const tp = board[tr - ROW_MIN]?.[tc - COL_MIN];
              if (tp && tp.color === enemy) {
                enemiesUnderGiant.push({row: tr, col: tc, piece: tp});
              }
              // 检查敌方天将
              const underTJ = tianJiangs.find(tj =>
                tj.color !== color &&
                ((tj.isHalved && tj.row === tr && tj.leftCol === tc) ||
                 (!tj.isHalved && tj.row === tr && (tj.leftCol === tc || tj.rightCol === tc)))
              );
              if (underTJ && !enemiesUnderGiant.some(e => e.piece === underTJ)) {
                enemiesUnderGiant.push({row: tr, col: tc, piece: underTJ, isTianJiang: true});
              }
            }
          }`;

c = c.replace(oldEatSection, newEatSection);
console.log("✅ BUG 1: TianJiang collection in giant eater added");

// Now fix the eating logic to handle tianjiangs
let eatLogicStart = c.indexOf("// 吃子：如果敌方棋子数量", giantApplyStart);
let eatLogicEnd = c.indexOf("放置巨将标记", eatLogicStart);
let oldEatLogic = c.substring(eatLogicStart, eatLogicEnd);

let newEatLogic = 
`          // 吃子：如果敌方棋子数量<=3，全部吃掉；如果>3，随机选3个
          if (enemiesUnderGiant.length > 0) {
            const toEat = enemiesUnderGiant.length <= 3 ? enemiesUnderGiant
              : enemiesUnderGiant.sort(() => Math.random() - 0.5).slice(0, 3);
            toEat.forEach(({row, col, piece, isTianJiang}) => {
              if (isTianJiang) {
                // 天将被碾压：掉血
                const tj = piece;
                const attackedCol = col; // 被攻击的列
                tj.hp--;
                if (tj.hp > 0 && !tj.isHalved) {
                  // 半血：缩到未被攻击的另一格
                  tj.isHalved = true;
                  const surviveCol = (attackedCol === tj.leftCol) ? tj.rightCol : tj.leftCol;
                  const oldL = tj.leftCol, oldR = tj.rightCol;
                  if (board[tj.row - ROW_MIN]?.[oldL - COL_MIN]) {
                    board[tj.row - ROW_MIN][oldL - COL_MIN] = null;
                  }
                  if (board[tj.row - ROW_MIN]?.[oldR - COL_MIN]) {
                    board[tj.row - ROW_MIN][oldR - COL_MIN] = null;
                  }
                  tj.leftCol = surviveCol;
                  tj.rightCol = surviveCol;
                  log(\`\${tj.color === RED ? '红' : '黑'}方天将\${tj.type}受创，缩为一格！\`, 'warn');
                } else if (tj.hp <= 0) {
                  // 死亡
                  if (!tj.isHalved) {
                    const otherCol = (attackedCol === tj.leftCol) ? tj.rightCol : tj.leftCol;
                    if (board[tj.row - ROW_MIN]?.[otherCol - COL_MIN]) {
                      board[tj.row - ROW_MIN][otherCol - COL_MIN] = null;
                    }
                  }
                  tianJiangs.splice(tianJiangs.indexOf(tj), 1);
                  log(\`\${tj.color === RED ? '红' : '黑'}方天将\${tj.type}被击杀！\`, 'warn');
                }
              } else {
                if (REVIVABLE_TYPES.includes(piece.name)) {
                  const pool = piece.color === BLACK ? deadPoolBlack : deadPoolRed;
                  pool.push(piece.name);
                }
                board[row - ROW_MIN][col - COL_MIN] = null;
              }
            });
            log(\`💥 巨将碾压！吃掉了 \${toEat.length} 枚敌方棋子\`, 'info');
          }`;

c = c.replace(oldEatLogic, newEatLogic);
console.log("✅ BUG 1: TianJiang damage/hp handling in giant eater added");

// ====================================================================
// BUG 2: Click handler - enable pieces to target giants
// ====================================================================
// Find the condition that excludes giants and add a separate check for giant targeting
let oldPieceTargetCheck = `      // 如果已选中己方棋子，且点击的是敌方棋子，优先尝试吃子移动
      if (selectedPiece && piece && piece.color !== currentPlayer && piece.name !== '巨将'){`;

let newPieceTargetCheck = `      // 如果已选中己方棋子，且点击的是敌方棋子，优先尝试吃子移动
      // 特殊处理：点击巨将（board 上有巨将标记，但 piece.name === '巨将' 会被上方条件排除）
      let isGiantCell = false;
      if (selectedPiece && !piece && selectedPiece.type === 'board') {
        for (const g of giants) {
          if (g.color !== currentPlayer &&
              g.topLeftRow <= logicRow && logicRow <= g.topLeftRow + 1 &&
              g.topLeftCol <= logicCol && logicCol <= g.topLeftCol + 1) {
            isGiantCell = true;
            break;
          }
        }
      }
      // 如果是己方棋子点击到巨将区域（board 格子可能为空但实际是巨将），强制查找移动
      if (selectedPiece && selectedPiece.type === 'board' && isGiantCell) {
        const move = generateMoves(currentPlayer).find(m => {
          if (m.type === 'piece' && m.fromRow === selectedPiece.row && m.fromCol === selectedPiece.col &&
              m.toRow === logicRow && m.toCol === logicCol) return true;
          return false;
        });
        if (move) {
          if (applyMove(move, currentPlayer)) {
            currentPlayer = currentPlayer === RED ? BLACK : RED;
            selectedPiece = null;
            validMoves = [];
            dangerMoves = [];
            drawBoard();
            statusBar.textContent = \`手动移动完成，轮到\${currentPlayer === 'red' ? '红' : '黑'}方\`;
            return;
          }
        }
      }
      // 同时修正现有条件：piece.name !== '巨将' 改为也放行巨将格子
      // 但上面已经特殊处理了，这里保持原有逻辑
      if (selectedPiece && piece && piece.color !== currentPlayer && piece.name !== '巨将'){`;

c = c.replace(oldPieceTargetCheck, newPieceTargetCheck);
console.log("✅ BUG 2: Click handler updated to allow piece-giant targeting");

// ====================================================================
// BUG 3: Fix the empty cell click handler to also accept giant cells
// ====================================================================
// Find the "点击空格移动" section and add giant cell checking
let spaceMoveIdx = c.indexOf("// 点击空格移动");
if (spaceMoveIdx >= 0) {
  let oldSpaceCheck = `      // 点击空格移动
      if(selectedPiece && !piece) {`;

  let newSpaceCheck = `      // 点击空格移动（或点击巨将区域）
      // 检查是否点击了巨将（board 可能标记为空但实际是巨将区域）
      let isGiantCell2 = false;
      if (selectedPiece && selectedPiece.type === 'board') {
        for (const g of giants) {
          if (g.color !== currentPlayer &&
              g.topLeftRow <= logicRow && logicRow <= g.topLeftRow + 1 &&
              g.topLeftCol <= logicCol && logicCol <= g.topLeftCol + 1) {
            isGiantCell2 = true;
            break;
          }
        }
      }
      if(selectedPiece && (!piece || isGiantCell2)) {`;

  c = c.replace(oldSpaceCheck, newSpaceCheck);
  console.log("✅ BUG 2 (space click): Giant cells in space-click handler updated");
}

// Now also verify the attackedGiant path in applyMove - ensure it's not intercepted
// The structure should be:
// else { // for piece moves
//   const piece = board[fromRow][fromCol];
//   const target = board[toRow][toCol];
//   // check tianjiang...
//   if (attackedTianJiang) {
//     ... tianjiang damage ...
//   } else if (true) { // check giant
//     const attackedGiant = giants.find(...);
//     if (attackedGiant) {
//       ... giant damage + knockback ...
//     } else {
//       // normal eat
//     }
//   }
// }

// This structure looks correct - the else if(true) ensures giant is checked after tianjiang.
// The only issue would be if target is null (empty board cell where giant stands).
// In generateMoves, when a piece moves to a giant cell:
//   target = board[nr-ROW_MIN]?.[nc-COL_MIN]; // this is {name:'巨将', color:enemy}
//   canEat = (target && target.color === enemy) // this is TRUE
// So the move IS generated. Then in applyMove:
//   target = board[move.toRow-ROW_MIN]?.[move.toCol-COL_MIN]; // {name:'巨将', color:enemy}
// The tianjiang check: attackedTianJiang = tianJiangs.find(...) - won't match giant
// Then: } else if (true) { attackedGiant = giants.find(...) - WILL match!
// So the applyMove path IS correct.
// The problem was ONLY in the click handler (BUG 2 fixed above).

// ====================================================================
// Verify all fixes
// ====================================================================
console.log("\n=== Verification ===");
console.log("1. TianJiang collection in giant eater:", c.includes("underTJ = tianJiangs.find") ? "✅" : "❌");
console.log("   TianJiang HP handling:", c.includes("isTianJiang") ? "✅" : "❌");
console.log("   TianJiang death splice:", c.includes("tianJiangs.splice(tianJiangs.indexOf(tj), 1)") ? "✅" : "❌");
console.log("2. Piece-giant click handling:", c.includes("isGiantCell") ? "✅" : "❌");
console.log("   Giant cell in space click:", c.includes("isGiantCell2") ? "✅" : "❌");
console.log("3. Friendly tianjiang excluded:", c.includes("tj.color !== color") ? "✅" : "❌");

// Save
fs.writeFileSync("index.html", c, "utf8");
console.log("\n✅ All fixes saved!");
