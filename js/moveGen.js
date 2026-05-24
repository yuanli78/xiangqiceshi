// ===== 移动生成 =====
import { ROW_MIN, ROW_MAX, COL_MIN, COL_MAX, ROWS, COLS, LINE_SPAN, PADDING,
  RED, BLACK, RED_COLOR, BLACK_COLOR, REVIVABLE_TYPES,
  bridgeCells, bridgeSet, pieceValues, ruleMap, isYuBridge } from "./data.js";
import { board, tianJiangs, giants, stackedDancers, currentPlayer,
  deadPoolBlack, deadPoolRed, checkWinner } from "./gameState.js";

  function isBridge(row, col) {
    return bridgeCells.some(b => b.row === row && b.col === col);
  }

 function isCellAttacked(row, col, defenderColor) {
   const attackerColor = defenderColor === RED ? BLACK : RED;
   // 检查普通棋子
   for (let r = 0; r < ROWS; r++) {
     for (let c = 0; c < COLS; c++) {
       const piece = board[r][c];
       if (!piece || piece.color !== attackerColor) continue;
       if (canPieceAttackCell(piece, ROW_MIN + r, COL_MIN + c, row, col)) return true;
     }
   }
  // 检查天将
  for (const tj of tianJiangs) {
    if (tj.color !== attackerColor) continue;
    const cells = tj.isHalved ? [{row: tj.row, col: tj.leftCol}] : [{row: tj.row, col: tj.leftCol}, {row: tj.row, col: tj.rightCol}];
    for (const cell of cells) {
      if (canTianJiangAttackCell(tj, cell.row, cell.col, row, col)) return true;
    }
  }
   // 检查巨将（巨将移动后覆盖2x2区域，可能攻击到目标格）
   for (const g of giants) {
     if (g.color !== attackerColor) continue;
     // 巨将一次移动两格，若目标格在其某次移动后的四格范围内，则视为攻击
     // 简化：检查巨将当前位置的相邻2×2区域是否能覆盖目标格（即距离<=2）
     if (Math.abs(row - g.topLeftRow) <= 2 && Math.abs(col - g.topLeftCol) <= 2) {
       // 进一步精确：巨将只能横竖走两格，若目标格在移动后的四格内，则攻击
       // 这里简单处理：若目标格与巨将当前覆盖范围的行列差距不超2，则认为可攻击
       const dr = row - g.topLeftRow, dc = col - g.topLeftCol;
       if ((Math.abs(dr) === 2 && dc >= 0 && dc <= 1) || (Math.abs(dc) === 2 && dr >= 0 && dr <= 1)) return true;
     }
   }
   return false;
 }

 function canPieceAttackCell(piece, fromRow, fromCol, toRow, toCol) {
   const dr = toRow - fromRow, dc = toCol - fromCol;
   const name = piece.name;
   // 车类横竖任意距离
   if (['车','飞车','战车','异型车','追','截','隔','擒','指','声','苦','空','树','打','柱','远','主','虢','釜'].includes(name)) {
     if (dr === 0 && dc !== 0) {
       const step = dc > 0 ? 1 : -1;
       for (let c = fromCol + step; c !== toCol; c += step) if (board[fromRow-ROW_MIN]?.[c-COL_MIN]) return false;
       return true;
     }
     if (dc === 0 && dr !== 0) {
       const step = dr > 0 ? 1 : -1;
       for (let r = fromRow + step; r !== toRow; r += step) if (board[r-ROW_MIN]?.[fromCol-COL_MIN]) return false;
       return true;
     }
   }
   // 炮类隔子吃
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
   }
   // 马类日字
   if (['马','飞马','战马','骡','异型马','妃'].includes(name)) {
     if ((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2)) {
       // 简单忽略蹩腿，这里只判断攻击可能
       return true;
     }
   }
   // 斜线兵种及士类
   if (['士','飞士','战士','士卒','影士','象','飞象','战象','国象','鹿','驼','悬','蝉','后','天兵','牵','混','笑','瞒','狐'].includes(name)) {
     if (Math.abs(dr) === Math.abs(dc) && dr !== 0) {
       const stepR = dr > 0 ? 1 : -1, stepC = dc > 0 ? 1 : -1;
       let r = fromRow + stepR, c = fromCol + stepC;
       while (r !== toRow && c !== toCol) {
         if (board[r-ROW_MIN]?.[c-COL_MIN]) return false;
         r += stepR; c += stepC;
       }
       return true;
     }
   }
   // 将类（飞将、战将等）横竖斜一格
   if (['飞将','战将','异型将'].includes(name)) {
     if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;
     // 战将远距离吃子（直线或斜线无障碍）
     if (name === '战将') {
       if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
         const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
         const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
         let r = fromRow + stepR, c = fromCol + stepC;
         while (r !== toRow && c !== toCol) {
           if (board[r-ROW_MIN]?.[c-COL_MIN]) return false;
           r += stepR; c += stepC;
         }
         return true;
       }
     }
   }
   // 其他棋子暂时认为不能远距离攻击
   return false;
 }

 function canTianJiangAttackCell(tj, fromRow, fromCol, toRow, toCol) {
   const dr = toRow - fromRow, dc = toCol - fromCol;
   // 天将默认横竖走一格
   if ((Math.abs(dr) === 1 && dc === 0) || (Math.abs(dc) === 1 && dr === 0)) return true;
   // 升级后或壳存在时可走士线一格
   if (tj.isUpgraded || tj.type === '真' && board.some(row => row.some(p => p && p.color === tj.color && p.name === '壳'))) {
     if (Math.abs(dr) === 1 && Math.abs(dc) === 1) return true;
   }
   // 卫现身后横竖任意距离
   if (tj.type === '卫' && tj.isRevealed) {
     if (dr === 0 && dc !== 0) {
       const step = dc > 0 ? 1 : -1;
       for (let c = fromCol + step; c !== toCol; c += step) if (board[fromRow-ROW_MIN]?.[c-COL_MIN]) return false;
       return true;
     }
     if (dc === 0 && dr !== 0) {
       const step = dr > 0 ? 1 : -1;
       for (let r = fromRow + step; r !== toRow; r += step) if (board[r-ROW_MIN]?.[fromCol-COL_MIN]) return false;
       return true;
     }
   }
   return false;
 }

 function isTianJiangInCheck(tj) {
   const cells = tj.isHalved ? [{row: tj.row, col: tj.leftCol}] : [{row: tj.row, col: tj.leftCol}, {row: tj.row, col: tj.rightCol}];
   return cells.some(c => isCellAttacked(c.row, c.col, tj.color));
 }

 function getCheckType(tj) {
   const cells = tj.isHalved ? [{row: tj.row, col: tj.leftCol}] : [{row: tj.row, col: tj.leftCol}, {row: tj.row, col: tj.rightCol}];
   const attackerColor = tj.color === RED ? BLACK : RED;
   for (const cell of cells) {
     for (let r = 0; r < ROWS; r++) {
       for (let c = 0; c < COLS; c++) {
         const piece = board[r][c];
         if (!piece || piece.color !== attackerColor) continue;
         if (canPieceAttackCell(piece, ROW_MIN+r, COL_MIN+c, cell.row, cell.col)) {
           const n = piece.name;
           if (['车','飞车','战车','异型车','追','截','隔','擒','指','声','苦','空','树','打','柱','远','主','虢','釜'].includes(n)) return '车';
           if (['马','飞马','战马','骡','异型马','妃'].includes(n)) return '马';
           if (['炮','飞炮','战炮','抛石器','异型炮','暗','趁','欲','砖'].includes(n)) return '炮';
           return 'other';
         }
       }
     }
     // 检查天将
     for (const otj of tianJiangs) {
       if (otj.color !== attackerColor) continue;
       const ocells = otj.isHalved ? [{row: otj.row, col: otj.leftCol}] : [{row: otj.row, col: otj.leftCol}, {row: otj.row, col: otj.rightCol}];
       for (const ac of ocells) {
         if (canTianJiangAttackCell(otj, ac.row, ac.col, cell.row, cell.col)) return 'other';
       }
     }
   }
   return null; // 未被将军
 }

  function wouldCauseGeneralFaceoff(tj, newCells, color) {
      const enemyColor = color === RED ? BLACK : RED;
      const enemyZhen = tianJiangs.find(t => t.type === '真' && t.color === enemyColor);
      if (!enemyZhen) return false;
  
      const enemyCells = enemyZhen.isHalved ? [{row: enemyZhen.row, col: enemyZhen.leftCol}] : [{row: enemyZhen.row, col: enemyZhen.leftCol}, {row: enemyZhen.row, col: enemyZhen.rightCol}];
  
      // 检查是否在同一条纵线上且中间无遮挡
      for (const nc of newCells) {
          for (const ec of enemyCells) {
              if (nc.col === ec.col) {
                  const minRow = Math.min(nc.row, ec.row);
                  const maxRow = Math.max(nc.row, ec.row);
                  let blocked = false;
                  for (let r = minRow + 1; r < maxRow; r++) {
                      if (board[r-ROW_MIN]?.[nc.col-COL_MIN]) { blocked = true; break; }
                  }
                  if (!blocked) return true; // 照面
              }
          }
      }
      return false;
  }

  function generateMoves(color) {
    const moves = [];
    const enemy = color===RED?BLACK:RED;
    const deadPool = color===BLACK ? deadPoolBlack : deadPoolRed;
    const medical = color===BLACK ? medicalBlack : medicalRed;
    const shore = color===BLACK ? BLACK_SHORE : RED_SHORE;

    stackedDancers.filter(d=>d.color===color).forEach(d=>{
      const row = d.row, col = d.col;
      for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++) {
        if(dr===0 && dc===0) continue;
        const nr=row+dr, nc=col+dc;
        if(nr<ROW_MIN||nr>ROW_MAX||nc<COL_MIN||nc>COL_MAX) continue;
        if(isInRiver(nr)) continue;
        moves.push({type:'stackedDancer', dancer:d, toRow:nr, toCol:nc, isEat:false, pieceName:'舞'});
      }
    });

    tianJiangs.filter(t => t.color === color).forEach(t => {
        const enemy = color === RED ? BLACK : RED;
        const inCheck = isTianJiangInCheck(t);
        const checkType = inCheck ? getCheckType(t) : null;
        const shellAlive = board.some(row => row.some(p => p && p.color === color && p.name === '壳'));
  
        // 当前天将占据的格子
        const currentCells = t.isHalved ? [{row: t.row, col: t.leftCol}] : [{row: t.row, col: t.leftCol}, {row: t.row, col: t.rightCol}];
  
        // 收集偏移量
        let offsets = [];
  
        if (inCheck) {
            // 被将军时的特异走法
            if (checkType === '车') {
                // 可横竖走一至两格（不能吃子、不可越子、不可造成将帅照面）
                offsets.push([-1,0],[1,0],[0,-1],[0,1],[-2,0],[2,0],[0,-2],[0,2]);
            } else if (checkType === '马') {
                // 可走一格，或日字斜对角跳（有蹩腿限制、不能吃子）
                offsets.push([-1,0],[1,0],[0,-1],[0,1],[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]);
            } else if (checkType === '炮') {
                // 可横竖走一格，或隔一子紧邻跳过（不能吃子）
                offsets.push([-1,0],[1,0],[0,-1],[0,1],[-2,0],[2,0],[0,-2],[0,2]);
            } else {
                // 其他棋子将军，只能走一格
                offsets.push([-1,0],[1,0],[0,-1],[0,1]);
            }
        } else {
            // 标准走法：横竖一格
            offsets.push([-1,0],[1,0],[0,-1],[0,1]);
        
            // 壳棋存在或真将升级（大将）：士线一格
            if (shellAlive || (t.type === '真' && t.isUpgraded)) {
                offsets.push([-1,-1],[-1,1],[1,-1],[1,1]);
            }
            // 壳棋存在时的隔子跳（横竖两格，必须隔一子）
            if (shellAlive) {
                offsets.push([-2,0],[2,0],[0,-2],[0,2]);
                // 士线隔子跳（壳独有）
                offsets.push([-2,-2],[-2,2],[2,-2],[2,2]);
            }
        }
  
        // 卫现身后：车走法
        if (t.type === '卫' && t.isRevealed) {
            offsets = [];
            for (let step = 1; step <= 8; step++) offsets.push([-step,0],[step,0],[0,-step],[0,step]);
        }
  
        // 去重
        offsets = [...new Set(offsets.map(o => `${o[0]},${o[1]}`))].map(s => s.split(',').map(Number));
  
        for (const [dr, dc] of offsets) {
            if (dr === 0 && dc === 0) continue;
      
            const newCells = currentCells.map(c => ({ row: c.row + dr, col: c.col + dc }));
      
            // 边界检查
            if (newCells.some(c => c.row < ROW_MIN || c.row > ROW_MAX || c.col < COL_MIN || c.col > COL_MAX)) continue;
            // 河界检查（天将不可入河）
            if (newCells.some(c => isInRiver(c.row, c.col))) continue;
      
            // 是否被己方棋子占据（己方天将不阻挡，包括自己和其他天将）
            if (newCells.some(c => {
                const p = board[c.row - ROW_MIN]?.[c.col - COL_MIN];
                if (!p) return false;               // 空格不挡
                if (p.color !== color) return false; // 敌方棋子不在这里挡（后面会处理吃子）
                // 只要是己方天将（无论真、卫、半血），都允许通过
                if (p.name.startsWith('天将')) return false;
                return true; // 其他己方棋子阻挡
            })) continue;
                    // 桥权限：椭圆天将只能走御桥，半血天将无限制
            if (newCells.some(c => {
              if (isBridge(c.row, c.col)) {
                if (t.isHalved) return false; // 半血可走任意桥
                if (isYuBridge(c.col)) return false; // 御桥可走
                return true; // 非御桥阻挡
              }
              return false;
            })) continue;
            // 判断是“走两格/日字/隔子跳”中的哪一种
            const isTwoStep = (Math.abs(dr) === 2 && dc === 0) || (Math.abs(dc) === 2 && dr === 0);
            const isKnightJump = (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
            const isDiagonalTwoStep = Math.abs(dr) === 2 && Math.abs(dc) === 2;
      
            if (isTwoStep) {
                // 走两格：需要判断是“特异走法（不能越子）”还是“壳棋隔子跳（必须隔子）”
                const midRow = currentCells[0].row + (dr > 0 ? 1 : -1);
                const midCol = currentCells[0].col + (dc > 0 ? 1 : -1);
                const midHasPiece = !!board[midRow-ROW_MIN]?.[midCol-COL_MIN];
          
                if (shellAlive && !inCheck) {
                    // 壳棋隔子跳：必须隔一子
                    if (!midHasPiece) continue;
                } else {
                    // 特异走法（被车/炮将）：不能越子
                    if (midHasPiece) continue;
                }
            }
      
            if (isKnightJump) {
                // 日字跳蹩腿检查（完整版）
                if (Math.abs(dr) === 2) {
                    // 横向日字：纵向跳，检查横向蹩腿
                    const legRow = currentCells[0].row + (dr > 0 ? 1 : -1);
                    const legCol = currentCells[0].col;
                    if (board[legRow-ROW_MIN]?.[legCol-COL_MIN]) continue;
                } else {
                    // 纵向日字：横向跳，检查纵向蹩腿
                    const legRow = currentCells[0].row;
                    const legCol = currentCells[0].col + (dc > 0 ? 1 : -1);
                    if (board[legRow-ROW_MIN]?.[legCol-COL_MIN]) continue;
                }
            }
      
            if (isDiagonalTwoStep) {
                // 士线隔子跳（壳棋）：检查中间斜点是否有棋子
                const midRow = currentCells[0].row + (dr > 0 ? 1 : -1);
                const midCol = currentCells[0].col + (dc > 0 ? 1 : -1);
                if (!board[midRow-ROW_MIN]?.[midCol-COL_MIN]) continue; // 必须隔一子
            }
      
            // 检查目标格是否有敌子（包括敌方天将）
            const hasEnemy = newCells.some(c => {
                const p = board[c.row-ROW_MIN]?.[c.col-COL_MIN];
                if (p && p.color === enemy) return true;
                return tianJiangs.some(etj => etj.color === enemy && etj.row === c.row && (etj.leftCol === c.col || etj.rightCol === c.col));
            });
      
            // 允许在任何情况下吃子，风险由玩家通过白点自行判断
            const canEat = hasEnemy;
      
            moves.push({
                type: 'tianjiang',
                tj: t,
                toRow: newCells[0].row,
                toLeftCol: newCells[0].col,
                isEat: canEat,
                pieceName: '天将' + t.type
            });
        }
    });

   giants.filter(g=>g.color===color).forEach(g=>{
      for(let dr=-2; dr<=2; dr+=2) for(let dc=-2; dc<=2; dc+=2) {
        if(dr===0 && dc===0) continue;
        const nr=g.topLeftRow+dr, nc=g.topLeftCol+dc;
        if(nr<ROW_MIN||nr+1>ROW_MAX||nc<COL_MIN||nc+1>COL_MAX) continue;
        // 巨将不能踏上任何桥格
        if (isBridge(nr, nc) || isBridge(nr, nc+1) || isBridge(nr+1, nc) || isBridge(nr+1, nc+1)) continue;
        // 检查目标四格内是否有己方棋子
        let ownPiece = false;
        for (let or = 0; or < 2; or++) {
          for (let oc = 0; oc < 2; oc++) {
            const orow = nr + or, ocol = nc + oc;
            if (orow < ROW_MIN || orow > ROW_MAX || ocol < COL_MIN || ocol > COL_MAX) continue;
            const op = board[orow - ROW_MIN]?.[ocol - COL_MIN];
            if (op && op.color === color) { ownPiece = true; break; }
          }
          if (ownPiece) break;
        }
        if (ownPiece) continue;
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
    });

     for(let r=0; r<ROWS; r++) for(let c=0; c<COLS; c++) {
      const piece=board[r][c]; if(!piece || piece.color!==color || piece.name==='巨将') continue;
      if(piece.name.startsWith('天将')) continue; // 天将已由专门逻辑处理，此处跳过
      if(piece.name==='炮' && stackedDancers.some(d=>d.row===ROW_MIN+r && d.col===COL_MIN+c && d.color===color)) continue;
      const row=ROW_MIN+r, col=COL_MIN+c;
      if(piece.name==='国象' && !isOwnHalf(row, color)) continue;

      let offsets = []; 
      if(['象','飞象','战象'].includes(piece.name)) offsets = [[-2,-2],[-2,2],[2,-2],[2,2],[-1,-1],[-1,1],[1,-1],[1,1]];
      else if(['士','飞士','战士','士卒','影士'].includes(piece.name)) offsets = [[-1,-1],[-1,1],[1,-1],[1,1]];
      else if(['马','飞马','战马','骡','异型马'].includes(piece.name)) offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      else if(['车','飞车','战车','异型车','诏','借','调','擒','隔','声','指','苦','围','人','以','打','柱','远','主','釜'].includes(piece.name)) {
        for(let step=1; step<=8; step++) offsets.push([-step,0],[step,0],[0,-step],[0,step]);
      } else if(['炮','飞炮','战炮','抛石器','异型炮','欲','趁','虎','暗','空','砖','虢'].includes(piece.name)) {
        for(let step=1; step<=8; step++) offsets.push([-step,0],[step,0],[0,-step],[0,step]);
      } else if(['兵','重兵','丁','勇','步','步兵','烈','美','假','妃','关','上','畈','蛇'].includes(piece.name)) {
        offsets = [[-1,0],[1,0],[0,-1],[0,1]];
      } else if(['无','走','壳','连','李','鬼'].includes(piece.name)) {
        offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      } else if(piece.name === '雷') {
        for(let step=1; step<=8; step++) offsets.push([-step,0],[step,0],[0,-step],[0,step]);
      } else if(piece.name === '军师') {
        for(let step=1; step<=8; step++) {
          for(let [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nr=row+dr*step, nc=col+dc*step;
            if(nr<ROW_MIN||nr>ROW_MAX||nc<COL_MIN||nc>COL_MAX) continue;
            const target=board[nr-ROW_MIN]?.[nc-COL_MIN];
            if(target) { const jumpRow=nr+dr, jumpCol=nc+dc; if(jumpRow>=ROW_MIN&&jumpRow<=ROW_MAX&&jumpCol>=COL_MIN&&jumpCol<=COL_MAX && !board[jumpRow-ROW_MIN]?.[jumpCol-COL_MIN]) offsets.push([jumpRow-row, jumpCol-col]); break; }
            if(board[nr-ROW_MIN]?.[nc-COL_MIN]) break;
          }
        }
      } else if(piece.name === '御') {
        for(let step=1; step<=8; step++) offsets.push([-step,0],[step,0],[0,-step],[0,step]);
        for(let step=1; step<=8; step++) offsets.push([-step,-step],[-step,step],[step,-step],[step,step]);
      } else if(piece.name === '鹿') offsets = [[-2,-2],[-2,2],[2,-2],[2,2]];
      else if(piece.name === '蝉') for(let step=1; step<=8; step++) offsets.push([-step,0],[step,0],[0,-step],[0,step]);
      else if(piece.name === '后') {
        for(let step=1; step<=8; step++) offsets.push([-step,0],[step,0],[0,-step],[0,step]);
        for(let step=1; step<=8; step++) offsets.push([-step,-step],[-step,step],[step,-step],[step,step]);
      } else if(piece.name === '驼' || piece.name === '悬') offsets = [[-2,-2],[-2,2],[2,-2],[2,2]];
      else if(piece.name === '翔') for(let step=1; step<=8; step++) offsets.push([-step,0],[step,0],[0,-step],[0,step]);
      else if(piece.name === '天兵') offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      else if(piece.name === '巫' || piece.name === '政' || piece.name === '烈') offsets = [[-1,0],[1,0],[0,-1],[0,1]];
      else if(piece.name === '官') offsets = [[-1,-1],[-1,1],[1,-1],[1,1],[-2,-2],[-2,2],[2,-2],[2,2]];
      else if(piece.name === '追' || piece.name === '截') for(let step=1; step<=8; step++) offsets.push([-step,0],[step,0],[0,-step],[0,step]);
      else if(piece.name === '交' || piece.name === '涉') { const fwd=color===BLACK?1:-1; offsets.push([0,-1],[0,1],[-fwd,0]); }
      else if(piece.name === '日' || piece.name === '月' || piece.name === '卫') { offsets.push([0,-1],[0,1]); if(piece.name!=='卫') offsets.push([-1,0],[1,0]); }
      else if(piece.name === '城') offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      else if(piece.name === '舞') offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      else if(piece.name === '牵' || piece.name === '混') offsets = [[-1,-1],[-1,1],[1,-1],[1,1]];
      else if(piece.name === '笑' || piece.name === '瞒') offsets = [[-1,-1],[-1,1],[1,-1],[1,1],[-2,-2],[-2,2],[2,-2],[2,2]];
      else if(piece.name === '树') { for(let step=1; step<=8; step++) { if(row+step!==row) offsets.push([step,0],[-step,0]); if(col+step!==col) offsets.push([0,step],[0,-step]); } }
      else if(piece.name === '狐') offsets = [[-1,-1],[-1,1],[1,-1],[1,1]];
      else if(piece.name === '测试') {
        // 测试棋子：全盘任意移动，全盘任意吃子
        for (let tr = ROW_MIN; tr <= ROW_MAX; tr++) {
          for (let tc = COL_MIN; tc <= COL_MAX; tc++) {
            if (tr === row && tc === col) continue; // 跳过自身
            if (isInRiver(tr, tc)) continue;; // 不入河（若需入河可删除此行）
            const tgt = board[tr - ROW_MIN]?.[tc - COL_MIN];
            if (tgt && tgt.color === color) continue; // 不选己方棋子
            const canEat = tgt && tgt.color === enemy;
            // 跳过巨将占位格（巨将特殊处理，测试棋不吃巨将可删此段）
            if (tgt && tgt.name === '巨将') continue;
            offsets.push([tr - row, tc - col]);
          }
        }
      }
      else if(piece.name === '画' || piece.name === '促') continue; // 画不能主动移动，促初始不能移动
      else offsets = [[-1,0],[1,0],[0,-1],[0,1]];
      // ========== 桥上纵向移动能力 ==========
      if (isBridge(row, col)) {
        // 如果原偏移量中没有上下移动，则添加
        if (!offsets.some(([r, c]) => r === 1 && c === 0)) offsets.push([1, 0]);
        if (!offsets.some(([r, c]) => r === -1 && c === 0)) offsets.push([-1, 0]);
      }
      for(let [dr,dc] of offsets) {
        const nr=row+dr, nc=col+dc;
        // 跨河移动强制目标格必须在桥上
        const crossRiver = (row <= BLACK_SHORE && nr >= RED_SHORE) || (row >= RED_SHORE && nr <= BLACK_SHORE);
        if (crossRiver && !isBridge(nr, nc)) continue;
        if(nr<ROW_MIN||nr>ROW_MAX||nc<COL_MIN||nc>COL_MAX) continue;
        if(['雷','军师','御','诏','隔','趁','关','上','狐'].includes(piece.name) && !isOwnHalf(nr, color)) continue;
        if(['交','涉'].includes(piece.name)) { const fwd=color===BLACK?1:-1; if(dr===fwd) continue; }
        if(['日','月','卫'].includes(piece.name) && nr!==shore) continue;
        if(['妃'].includes(piece.name)) { if(!tianJiangs.some(t=>t.color===color && t.row===(color===BLACK?0:17))) continue; }
        if(['树'].includes(piece.name)) { if(dr!==0 && ((row<shore && nr<shore)||(row>shore && nr>shore))) continue; if(dc!==0 && ((col<1 && nc<1)||(col>1 && nc>1))) continue; } 
        // 巨将占位：如果目标格属于己方巨将，不可移动；属于敌方巨将，按吃子处理
        const isOwnGiant = giants.some(g => g.color === color && g.topLeftRow <= nr && nr <= g.topLeftRow+1 && g.topLeftCol <= nc && nc <= g.topLeftCol+1);
        if (isOwnGiant) continue;
        if(isInRiver(nr, nc)) continue;
        const target=board[nr-ROW_MIN]?.[nc-COL_MIN];
        // 检查目标格是否被敌方天将占据（天将不在 board 数组里）
        const occupiedByOwnTianJiang = tianJiangs.some(tj => tj.color === color && tj.row === nr && (tj.leftCol === nc || tj.rightCol === nc));
        const occupiedByEnemyTianJiang = tianJiangs.some(tj => tj.color === enemy && tj.row === nr && (tj.leftCol === nc || tj.rightCol === nc));
        if(target && target.color===color) continue;
        if(occupiedByOwnTianJiang) continue; // 己方天将挡路，不能走
        let canEat = (target && target.color === enemy) || occupiedByEnemyTianJiang;
        if (piece.name !== '测试') {
           // 下面原有的所有 canEat 修改逻辑都保持不动
        if(['雷','军师','诏','政','截','日','月','卫','城','舞','美','借','调','牵','混','假','欲','无','关','上','空','走','狐','鬼','蛇','画','促','围','李','砖','柱','主','釜'].includes(piece.name)) canEat = false;
        if(piece.name==='追') { const fwd = color===BLACK?1:-1; if(dr!==fwd) canEat=false; }
        if(piece.name==='擒') { if(target && (target.name.includes('天将')||target.name==='飞将'||target.name==='战将'||target.name==='异型将')) canEat=true; else canEat=false; }
        if(piece.name==='笑') canEat = true;
        if(piece.name==='隔' || piece.name==='趁' || piece.name==='畈') canEat = false;
        if(piece.name==='声') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        if(piece.name==='指') { /* simplified */ canEat = target && target.color===enemy; }
        if(piece.name==='树') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        if(piece.name==='苦') { if(target && target.color===enemy) canEat=false; else if(target && target.color===color) canEat=true; }
        if(piece.name==='连') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        if(piece.name==='壳') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        if(piece.name==='暗') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        if(piece.name==='瞒') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        if(piece.name==='蛇') { if(target && target.color===enemy && (target.name==='士'||target.name==='象')) canEat=true; else canEat=false; }
        if(piece.name==='人') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        if(piece.name==='以') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        if(piece.name==='打') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        if(piece.name==='远') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        if(piece.name==='虢') { if(target && target.color===enemy) canEat=true; else canEat=false; }
        }// ← 这是新增的闭合括号
        moves.push({type:'piece', fromRow:row, fromCol:col, toRow:nr, toCol:nc, isEat:canEat, pieceName:piece.name});
      }
    }
    return moves;
  }

export { isBridge, generateMoves, isCellAttacked, canPieceAttackCell,
  canTianJiangAttackCell, isTianJiangInCheck, getCheckType, wouldCauseGeneralFaceoff };
