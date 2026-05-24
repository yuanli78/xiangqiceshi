const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");
fs.writeFileSync("index.html.bak4", c, "utf8");

// ====================================================================
// ISSUE 1: Fix the giant applyMove section - missing comment prefix, 
//           broken formatting, and missing closing braces
// ====================================================================

// Fix the broken comment "放置巨将标记到新位置" - it's missing // prefix
// This happened because the replacement code removed the // 
c = c.replace(
  "放置巨将标记到新位置",
  "// 放置巨将标记到新位置"
);

// Also fix the eating section - the `}` and comment structure may be broken
// Let's find the exact section and fix it
let giantSectionStart = c.indexOf("} else if(move.type==='giant') {");
let giantSectionEnd = c.indexOf("} else {", giantSectionStart);
let giantSection = c.substring(giantSectionStart, giantSectionEnd);

// Check: does the eat-section have a proper closing for toEat.forEach?
// The old code had:
// toEat.forEach(({row, col, piece}) => {
//   ... 
//   board[row - ROW_MIN][col - COL_MIN] = null;
// });  ← this closing brace + paren
// log(...)

// In new code we have:
// toEat.forEach(({row, col, piece, isTianJiang}) => {
//   if (isTianJiang) {
//     ... lots of code ...
//   } else {
//     ... 
//     board[row - ROW_MIN][col - COL_MIN] = null;
//   }  ← closing for else
// });  ← closing for forEach
// log(...)

// Let me check if the closing for toEat.forEach exists
let forEachEnd = giantSection.lastIndexOf("});");
let afterForEach = giantSection.substring(forEachEnd);
console.log("After forEach '});':", afterForEach.substring(0, 30));

// Check if there are proper closure at the end of the giant section
console.log("\nGiant section last 200 chars:");
console.log(giantSection.substring(giantSection.length - 200));

// ====================================================================
// ISSUE 2: Fix the click handler - ensure piece-giant targeting works
// ====================================================================
// The isGiantCell block we added for the piece-click-enemy section 
// needs to be in the click handler body. Let me find where it ended up

let clickIdx = c.indexOf("canvas.addEventListener('click'");
let clickEnd = c.indexOf("canvas.addEventListener('mousemove'", clickIdx);
let clickSection = c.substring(clickIdx, clickEnd);

// Find the piece-click-enemy block 
let pieceTargetIdx = clickSection.indexOf("selectedPiece && piece && piece.color !== currentPlayer && piece.name !== '巨将'");

// Check if isGiantCell code is before it
let beforePieceTarget = clickSection.substring(0, pieceTargetIdx);
let hasIsGiantCell = beforePieceTarget.includes("isGiantCell");
console.log("\nisGiantCell before piece-enemy block:", hasIsGiantCell);

if (!hasIsGiantCell) {
  console.log("Need to add isGiantCell block!");
  // Find the exact location in the full file
  let absPieceTargetIdx = clickIdx + pieceTargetIdx;
  let before = c.substring(absPieceTargetIdx - 100, absPieceTargetIdx);
  console.log("Before insertion point:", before);
}

// ====================================================================
// ISSUE 3: Fix TianJiang click handler for giant targeting
// ====================================================================
// Find the tianjiang section in the click handler that handles giant attacks
let tjClickSection = clickSection.indexOf("hoveredEnemyTJ");
console.log("\nTJ click section found at:", tjClickSection);

// ====================================================================
// Let me now build the COMPLETE fixed click handler section
// ====================================================================

// The click handler has these key parts (in order):
// 1. Giant selection
// 2. Stacked dancer selection  
// 3. If selectedPiece - hovered enemy TianJiang check (eat tianjiang)
// 4. ** NEED: Piece/TJ attacks Giant **
// 5. If selectedPiece && piece && enemy color (existing eat enemy)
// 6. Piece selection
// 7. If selectedPiece - hovered enemy TJ check (alternative path)
// 8. Space click to move
// 9. TianJiang selection

// I need to add giant-attack handling in sections that handle:
// A. After the existing enemy click check (add giant override before normal eat)
// B. In the space click section (click on giant's empty board cells)
// C. In the tianjiang hover/target section

// Let me find exact insertion points in the FULL file (not just click section)

// PART A: Add before the existing piece-on-enemy check
let enemyCheckStart = c.indexOf("// 如果已选中己方棋子，且点击的是敌方棋子，优先尝试吃子移动");
let addAfterThis = c.indexOf("// 同时修正现有条件", enemyCheckStart);
if (addAfterThis < 0) {
  // Find the actual condition line
  let condLine = c.indexOf("if (selectedPiece && piece && piece.color !== currentPlayer && piece.name !== '巨将'){", enemyCheckStart);
  addAfterThis = condLine;
}

// Build the giant check block to insert BEFORE the existing enemy check
let giantClickBlock = 
`      // 检查普通棋子攻击巨将
      if (selectedPiece && selectedPiece.type === 'board') {
        for (const g of giants) {
          if (g.color !== currentPlayer &&
              g.topLeftRow <= logicRow && logicRow <= g.topLeftRow + 1 &&
              g.topLeftCol <= logicCol && logicCol <= g.topLeftCol + 1) {
            const giantMove = generateMoves(currentPlayer).find(m =>
              m.type === 'piece' && m.fromRow === selectedPiece.row &&
              m.fromCol === selectedPiece.col && m.toRow === logicRow &&
              m.toCol === logicCol
            );
            if (giantMove) {
              if (applyMove(giantMove, currentPlayer)) {
                currentPlayer = currentPlayer === RED ? BLACK : RED;
                selectedPiece = null;
                validMoves = [];
                dangerMoves = [];
                drawBoard();
                statusBar.textContent = \`手动移动完成，轮到\${currentPlayer === 'red' ? '红' : '黑'}方\`;
                return;
              }
            }
            break;
          }
        }
      }

      // 检查天将攻击巨将
      if (selectedPiece && selectedPiece.type === 'tianjiang') {
        for (const g of giants) {
          if (g.color !== currentPlayer &&
              g.topLeftRow <= logicRow && logicRow <= g.topLeftRow + 1 &&
              g.topLeftCol <= logicCol && logicCol <= g.topLeftCol + 1) {
            const tj = selectedPiece.tj;
            const giantMove = generateMoves(currentPlayer).find(m =>
              m.type === 'tianjiang' && m.tj === tj &&
              m.toRow === logicRow &&
              (m.toLeftCol === logicCol || (!tj.isHalved && m.toLeftCol + 1 === logicCol))
            );
            if (giantMove) {
              if (applyMove(giantMove, currentPlayer)) {
                currentPlayer = currentPlayer === RED ? BLACK : RED;
                selectedPiece = null;
                validMoves = [];
                dangerMoves = [];
                drawBoard();
                statusBar.textContent = \`手动移动完成，轮到\${currentPlayer === 'red' ? '红' : '黑'}方\`;
                return;
              }
            }
            break;
          }
        }
      }
`;

// Insert the giant click block right before the existing enemy piece check
console.log("\nInserting giant attack check at", enemyCheckStart);
c = c.substring(0, enemyCheckStart) + giantClickBlock + "\n" + c.substring(enemyCheckStart);

// ====================================================================
// Now also fix the attackedGiant block indentation and check for issues
// ====================================================================
// Fix the indentation: `                        if (attackedGiant) {`
// should be `            if (attackedGiant) {`
c = c.replace(
  "                        if (attackedGiant) {",
  "            if (attackedGiant) {"
);

// ====================================================================
// Add try-catch to generateMoves for error trapping
// ====================================================================
// Wrap the generateMoves function body in try-catch
let genMoveIdx = c.indexOf("function generateMoves(color)");
let genBodyStart = c.indexOf("{", genMoveIdx);
let genBraceCount = 0;
let genEnd = -1;
for (let i = genBodyStart; i < c.length; i++) {
  if (c[i] === '{') genBraceCount++;
  else if (c[i] === '}') {
    genBraceCount--;
    if (genBraceCount === 0) { genEnd = i + 1; break; }
  }
}
let genBody = c.substring(genBodyStart, genEnd);
// Only wrap if not already wrapped
if (!genBody.includes("try {")) {
  let genContent = genBody.substring(1, genBody.length - 1); // remove { }
  let newGenBody = " {\n      try {\n" + genContent + "\n      } catch(e) { log(`❌ generateMoves异常: ${e.message}`, 'error'); return []; }\n    }";
  c = c.substring(0, genBodyStart) + newGenBody + c.substring(genEnd);
  console.log("✅ Added try-catch to generateMoves");
}

// ====================================================================
// Now let's check for brace balance
// ====================================================================
let scriptStart = c.indexOf("(function() {");
let scriptEnd = c.lastIndexOf("})();") + 5;
let scriptContent = c.substring(scriptStart, scriptEnd);
let opens = 0, closes = 0;
for (let ch of scriptContent) {
  if (ch === '{') opens++;
  if (ch === '}') closes++;
}
console.log("Brace balance after all fixes:", opens, closes, opens === closes ? "✅ BALANCED" : "❌ IMBALANCED");

// Save
fs.writeFileSync("index.html", c, "utf8");
console.log("✅ All fixes saved!");
