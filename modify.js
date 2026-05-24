const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

// ===== 1. Remove '巨将' from REVIVABLE_TYPES =====
// Remove the last element '巨将' from the REVIVABLE_TYPES array
content = content.replace(
  /const REVIVABLE_TYPES = \[([^\]]+)\];/,
  (match, arrStr) => {
    const items = arrStr.split(',').map(s => s.trim());
    // Remove '巨将' if present (last item)
    const filtered = items.filter(s => s !== "'巨将'");
    return `const REVIVABLE_TYPES = [${filtered.join(', ')}];`;
  }
);

// ===== 2. Ensure giants are initialized with hp: 4 in initPieces =====
// The current code already has hp: 4, but let's verify and ensure it exists
content = content.replace(
  /giants\.push\(\{color: BLACK, topLeftRow: 6, topLeftCol: -5, hp: 4\}\);/,
  'giants.push({color: BLACK, topLeftRow: 6, topLeftCol: -5, hp: 4});'
);
content = content.replace(
  /giants\.push\(\{color: RED, topLeftRow: 10, topLeftCol: 7, hp: 4\}\);/,
  'giants.push({color: RED, topLeftRow: 10, topLeftCol: 7, hp: 4});'
);

// ===== 3. Fix giant movement rules: check for own pieces and bridges =====
// Find the giants.forEach block in generateMoves and replace it
const giantMoveRegex = /giants\.filter\(g=>g\.color===color\)\.forEach\(g=>\{[\s\S]*?moves\.push\(\{type:'giant', giant:g, toRow:nr, toCol:nc, isEat: canEatGiant, pieceName:'巨将'\}\);/;

const newGiantMovesCode = `giants.filter(g=>g.color===color).forEach(g=>{
        for(let dr=-2; dr<=2; dr+=2) for(let dc=-2; dc<=2; dc+=2) {
          if(dr===0 && dc===0) continue;
          const nr=g.topLeftRow+dr, nc=g.topLeftCol+dc;
          if(nr<ROW_MIN||nr+1>ROW_MAX||nc<COL_MIN||nc+1>COL_MAX) continue;
          // 巨将不能踏上任何桥格（检查四角）
          if (isBridge(nr, nc) || isBridge(nr, nc+1) || isBridge(nr+1, nc) || isBridge(nr+1, nc+1)) continue;
          // 检查目标四格内是否有己方棋子（包括己方天将、巨将）
          let hasOwnPiece = false;
          for (let dr = 0; dr < 2 && !hasOwnPiece; dr++) {
            for (let dc = 0; dc < 2 && !hasOwnPiece; dc++) {
              const tr = nr + dr, tc = nc + dc;
              const tp = board[tr - ROW_MIN]?.[tc - COL_MIN];
              if (tp && tp.color === color) { hasOwnPiece = true; }
              // 检查是否踩到己方天将
              if (tianJiangs.some(tj => tj.color === color && tj.row === tr && (tj.leftCol === tc || tj.rightCol === tc))) {
                hasOwnPiece = true;
              }
              // 检查是否踩到己方叠舞
              if (stackedDancers.some(d => d.color === color && d.row === tr && d.col === tc)) {
                hasOwnPiece = true;
              }
            }
          }
          if (hasOwnPiece) continue;
          // 巨将碾压：覆盖四格内敌方棋子处理（在 applyMove 中执行实际吃子，这里标记可吃）
          let enemyCount = 0;
          for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
              const tr = nr + dr, tc = nc + dc;
              const tp = board[tr - ROW_MIN]?.[tc - COL_MIN];
              if (tp && tp.color !== color) enemyCount++;
              // 敌方天将在巨将覆盖范围内也视为可碾压
              if (tianJiangs.some(tj => tj.color !== color && tj.row === tr && (tj.leftCol === tc || tj.rightCol === tc))) {
                enemyCount++;
              }
            }
          }
          const canEatGiant = enemyCount > 0;
          moves.push({type:'giant', giant:g, toRow:nr, toCol:nc, isEat: canEatGiant, pieceName:'巨将'});
        }
      });`;

// Find the giant move generation block and replace it
// We need to find the exact block. Let's search for a unique marker
const giantStartIdx = content.indexOf('giants.filter(g=>g.color===color).forEach(g=>{');
const giantEndIdx = content.indexOf('moves.push({type:\'giant\', giant:g, toRow:nr, toCol:nc, isEat: canEatGiant, pieceName:\'巨将\'});');
if (giantStartIdx >= 0 && giantEndIdx >= 0) {
  // Find the end of the push statement to include complete block
  const pushEndIdx = giantEndIdx + `moves.push({type:'giant', giant:g, toRow:nr, toCol:nc, isEat: canEatGiant, pieceName:'巨将'});`.length;
  // Find the closing of the forEach and the giants block - look for the next for loop or let statement
  const afterPush = content.substring(pushEndIdx);
  // The block ends with the closing braces of forEach. Let's find it properly.
  // After the push, there should be: \n        }\n      });\n\n       for(let r=0;...
  const blockEndMatch = afterPush.match(/^\s+\}\s+\}\);(\s+)/);
  if (blockEndMatch) {
    const blockEndIdx = pushEndIdx + blockEndMatch.index + blockEndMatch[0].length;
    content = content.substring(0, giantStartIdx) + newGiantMovesCode + content.substring(blockEndIdx);
  } else {
    // Fallback: use a simpler approach
    console.log("Could not find exact block end, using alternative approach");
    content = content.replace(
      /giants\.filter\(g=>g\.color===color\)\.forEach\(g=>\{[\s\S]*?moves\.push\(\{type:'giant', giant:g, toRow:nr, toCol:nc, isEat: canEatGiant, pieceName:'巨将'\}\);\s+\}\s+}\);(\s+)(?=for\()/,
      newGiantMovesCode + '\n$1'
    );
  }
}

// ===== 4. Fix cannon (炮) to not use giant as cannon mount (炮架) =====
// In the cannon eating logic in generateMoves, we need to skip giant positions when counting cannon mounts
// The cannon checking is done via `board[fromRow-ROW_MIN]?.[c-COL_MIN]` - need to add giant check
// Find the cannon section that checks for intervening pieces

// First, find where cannons do their eating logic in generateMoves
// The cannon pieces have for-step loops that count intervening pieces
// We need to modify the counting in the cannon's eat/capture logic to skip giants

// ===== 5. Fix applyMove giant section - the existing code is already mostly correct =====
// Let me check and enhance the giant applyMove code

// ===== 6. Enhance drawBoard giant selection to show 4 dots =====
// Find the giant selection code in the click handler
content = content.replace(
  /selectedPiece=\{type:'giant', topLeftRow:g\.topLeftRow, topLeftCol:g\.topLeftCol, color:g\.color\}; validMoves=generateMoves\(currentPlayer\)\.filter\(m=>m\.type==='giant'&&m\.giant\.topLeftRow===g\.topLeftRow&&m\.giant\.topLeftCol===g\.topLeftCol\)\.map\(m=>\(\{row:m\.toRow,col:m\.toCol\}\)\)/,
  `selectedPiece={type:'giant', topLeftRow:g.topLeftRow, topLeftCol:g.topLeftCol, color:g.color};
        const giantMoves = generateMoves(currentPlayer).filter(m=>m.type==='giant'&&m.giant.topLeftRow===g.topLeftRow&&m.giant.topLeftCol===g.topLeftCol);
        validMoves=[];
        giantMoves.forEach(m=>{
          // 巨将占据2x2，显示四个角作为合法移动点
          validMoves.push({row:m.toRow, col:m.toCol});
          validMoves.push({row:m.toRow, col:m.toCol+1});
          validMoves.push({row:m.toRow+1, col:m.toCol});
          validMoves.push({row:m.toRow+1, col:m.toCol+1});
        })`
);

// ===== 7. Check and fix the giant attack/HP system in applyMove =====
// The HP system and attack detection already look correct in the backup file
// Let me verify by ensuring the key pieces are in place

// ===== 8. Ensure cannon (炮) doesn't use giant as mount =====
// Find all the places where cannon checks for intervening pieces in generateMoves
// The cannons check board[] for pieces - we need to also check if those pieces are giants

// Patch for cannon eating: in the cannon code within generateMoves (for pieces, not giants),
// when counting intervening pieces (炮架), skip pieces that are giants
// The cannon code counts: let cnt = 0; ... if (board[fromRow-ROW_MIN]?.[c-COL_MIN]) cnt++;
// We need to also check if that piece is a giant and if so, treat it as no piece for mount purposes

// Let me find the cannon eat logic in generateMoves and add giant-skipping
// The cannon code block for checking intervening pieces (mounts) looks like:
// if (['炮','飞炮','战炮','抛石器','异型炮','...'] ... let cnt = 0; ... if (board[fromRow-ROW_MIN]?.[c-COL_MIN]) cnt++;

// Actually, looking at the code more carefully, the cannon eating works like this:
// When checking if a cannon can eat a piece at (toRow, toCol), it counts the number of pieces between
// the cannon and the target. If count === 1, it can eat.
// We need to EXCLUDE giant pieces from being counted as cannon mounts.
// So when counting, if the piece at a position is a giant (by checking giants array), skip it.

// This is tricky because the counting happens inline. Let me find the exact code.

// Actually, looking at the code more carefully, the cannon's ability to eat is determined
// in generateMoves where the moves are generated. The actual eat check happens
// when the move is being created. The cannon checks for intervening pieces in the
// offsets loop.

// The issue is in the section that creates cannon moves. Let me find it:
// The code generates offsets for cannons (all 8 directions), then for each offset,
// it checks if `target` exists at the destination and if so, handles eating.
// The mount/piece counting happens when checking if a cannon can eat.

// Wait - looking at the code more carefully, the cannon's special eating logic
// (隔子吃) is not in generateMoves directly for the move-level. Instead, it's in
// canPieceAttackCell function which determines if a piece can attack a cell.
// But for move generation, the condition is simpler.

// Let me look at how cannons generate moves - they use offsets and then check
// if canEat = (target && target.color === enemy). But cannons also need to check
// intervening pieces. Let me find where this is done...

// Looking at the code structure in generateMoves, after offsets are generated,
// it goes through each offset and checks conditions. For cannons specifically,
// the canEat check needs intervening pieces. But the current code just does:
// let canEat = (target && target.color === enemy) || occupiedByEnemyTianJiang;
// This doesn't account for cannons needing intervening pieces!

// This means the cannon mount logic is actually handled elsewhere, probably in
// a dedicated section. Let me look again...

// Actually wait - looking at the original code more carefully in generateMoves,
// I don't see a special cannon mount check at the move generation level.
// This could mean the cannon mount check is done elsewhere, or the code is missing it.
// Let me check canPieceAttackCell - it has cannon logic:
// if (['炮','飞炮','战炮','抛石器','异型炮',...].includes(name)) {
//   if (dr === 0 && dc !== 0) {
//     let cnt = 0; ... if (count === 1) return true;
//   }
// }
// This is in the attack checking function, not in move generation.

// So the situation is: cannons probably use a different mechanism to generate eat moves.
// Let me search for cannon-specific eat logic in the main move generation.

// Looking at the full generateMoves, after the offsets for-loop, there's a canEat assignment:
// let canEat = (target && target.color === enemy) || occupiedByEnemyTianJiang;
// Then various pieces override canEat. I don't see cannons overriding it.
// This likely means the current code treats cannons as normal pieces for move generation
// (generating all possible moves as long as the path is clear) and the cannon mount logic
// is only in canPieceAttackCell for check detection.

// Given this understanding, I need to add the cannon mount check in the move generation
// for cannons. This is a significant change that deserves careful thought.
// For now, let me add a check in the cannon sections of generateMoves to skip giant pieces
// when counting cannon mounts.

// Actually, looking more carefully, the cannons seem to have their move generation handled 
// generically: offsets are generated for all 8 directions (up to 8 steps each), and then
// in the for loop, each offset is checked. The code iterates through steps in the forward
// direction for each row/col offset.

// Wait, I see - for pieces with step-based movement like cannons, the code iterates through
// steps and checks each cell. It builds offsets like [-step, 0], [step, 0], [0, -step], [0, step].
// Then in the for loop for each offset, it checks if target exists at the destination.

// So for cannons, the "mount" check is NOT in the move generation - it treats them as 
// long-range pieces that can move to any empty square in their path, and can eat any
// enemy piece at the end of the path. The actual "mount required for eating" logic
// might be done elsewhere, or might not be fully implemented in the current version.

// Let me check if there's a special cannon eat check in the move validity section.
// After the offsets loop, there's:
// let canEat = (target && target.color === enemy) || occupiedByEnemyTianJiang;

// Then there's: 
// if (['炮','飞炮','战炮','抛石器','异型炮',...].includes(piece.name)) canEat = false;
// Wait no, I don't see this in the code. Let me check again...

// Actually looking at the code I don't see a special cannon eat handler.
// Let me take a different approach - I'll look at what the code does for cannons.

// In generateMoves, cannons are in this list:
// } else if(['炮','飞炮','战炮','抛石器','异型炮','...]).includes(piece.name)) {
//   for(let step=1; step<=8; step++) offsets.push([-step,0],[step,0],[0,-step],[0,step]);
// }

// So offsets are just all linear steps. Then in the for loop for each offset (nr, nc):
// let canEat = (target && target.color === enemy) || occupiedByEnemyTianJiang;
// This means any cannon can eat any enemy piece at any distance in its path!
// But with the obstruction check below:
// For these step-based pieces, the obstruction check happens naturally because
// the for loop processes offsets in order of increasing distance (step=1,2,3...),
// but wait - it doesn't. The offsets array has ALL steps mixed together.
// Let me look at the loop more carefully.

// In the offsets loop, each offset (dr, dc) is checked independently:
// for(let [dr,dc] of offsets) {
//   const nr=row+dr, nc=col+dc;
//   ... various checks ...
//   const target=board[nr-ROW_MIN]?.[nc-COL_MIN];
//   // ... check if target is own piece, etc.
//   let canEat = (target && target.color === enemy) || occupiedByEnemyTianJiang;
//   // ... various piece-specific canEat overrides ...
//   moves.push({...});
// }

// The obstruction check is done by: if(target && target.color===color) continue;
// This blocks movement past own pieces but doesn't stop at empty squares.
// For cannons, it should also stop at the first piece and check if it can eat past it.

// OK so the cannon logic in the existing code might not fully implement the 
// "must have exactly one intervening piece" rule. If that's the case, I should
// add it here, particularly ensuring giants cannot be used as mounts.

// Let me now make the actual changes to the file. I'll add:
// 1. A helper check in the generateMoves loop for cannons
// 2. The giant-related fixes already described above

// For now, let me focus on what I know needs to change and write the complete modified file.

fs.writeFileSync('index.html.modified', content, 'utf8');
console.log("Stage 1 complete - basic changes applied");

// Now let me count the total lines to verify
const lines = content.split('\n');
console.log(`Total lines: ${lines.length}`);
