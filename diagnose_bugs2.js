const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// Check: when a piece clicks on a giant, what happens?
// The condition is: if (selectedPiece && piece && piece.color !== currentPlayer && piece.name !== '巨将')
// Since giant cells in board[] contain {name:'巨将', color:RED}, piece will be non-null
// AND piece.name === '巨将' so the condition piece.name !== '巨将' is FALSE
// That's why clicking on a giant doesn't trigger the eat-move search!

console.log("=== BUG 2 root cause ===");

// Find the specific condition
let condIdx = c.indexOf("selectedPiece && piece && piece.color !== currentPlayer && piece.name !== '巨将'");
if (condIdx >= 0) {
  console.log("Found condition at", condIdx);
  console.log("Context:", c.substring(condIdx, condIdx + 60));
  
  // Find the move generation query inside that block
  let blockEnd = c.indexOf("return false;", condIdx);
  console.log("\nFull move matching block:");
  console.log(c.substring(condIdx, blockEnd + 30));
}

// Now check generateMoves for pieces attacking giants
// In generateMoves, when offsets are generated, and piece moves to (nr, nc)
// if board[nr-ROW_MIN][nc-COL_MIN] is {name:'巨将', color:enemy}, then:
// target = board[nr-ROW_MIN]?.[nc-COL_MIN]; (this would be {name:'巨将', color:enemy})
// canEat = (target && target.color === enemy) -- this would be true!
// So the move IS generated with isEat:true
// But in applyMove, the 'else' branch catches all piece moves. Then:

console.log("\n=== Check if piece attacking giant enters applyMove correctly ===");
// In the else branch:
// const piece = board[move.fromRow-ROW_MIN][move.fromCol-COL_MIN];
// const target = board[move.toRow-ROW_MIN]?.[move.toCol-COL_MIN];
// Then checks attackedTianJiang... if not, goes to attackedGiant check

// The issue: in the click handler:
// `if (selectedPiece && piece && piece.color !== currentPlayer && piece.name !== '巨将')`
// piece.name === '巨将', so this condition is FALSE!
// The code then falls through to "点击空格移动" which also won't match because piece exists.
// We need to add a separate check for giant cells.

console.log("\nFIX: Need to add a condition for clicking on enemy giant with a selected piece");
let giantCellCond = c.indexOf("selectedPiece && piece && piece.color !== currentPlayer && piece.name !== '巨将'");
let afterBlock = c.substring(giantCellCond, giantCellCond + 600);
console.log("After the condition, next lines:");
let lines = afterBlock.split("\n");
for (let i = 0; i < Math.min(lines.length, 10); i++) {
  console.log(lines[i]);
}
