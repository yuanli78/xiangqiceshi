// ===== 移动执行 =====
import { ROW_MIN, ROW_MAX, COL_MIN, COL_MAX, ROWS, COLS, LINE_SPAN, PADDING,
  RED, BLACK, RED_COLOR, REVIVABLE_TYPES, bridgeCells, pieceValues, isYuBridge,
  apEnabled, apMax, apRemaining, lastAPCost, getAPCost, updateAPDisplay } from "./data.js";
import { board, tianJiangs, giants, stackedDancers, currentPlayer,
  deadPoolBlack, deadPoolRed, historyStack, MAX_HISTORY,
  checkWinner, announceWinner, countPieces } from "./gameState.js";
import { log } from "./log.js";

  function applyMove(move, color) {
    try {
      // 保存当前状态（悔棋用）
              // AP消耗检查
      if (apEnabled) {
        let pc = move.pieceName;
        if (!pc && move.type === "giant") pc = "\u5de8\u5c06";
        if (!pc && move.type === "tianjiang") pc = "\u5929\u5c06";
        if (!pc && move.type === "stackedDancer") pc = "\u821e";
        const apCost = getAPCost(pc);
        if (apCost > apRemaining) {
          log("AP\u4e0d\u8db3\uff01\u9700\u8981" + apCost + "\u70b9\uff0c\u5269\u4f59" + apRemaining + "\u70b9", "warn");
          return false;
        }
        apRemaining -= apCost;
        lastAPCost = apCost;
        log("[AP] " + pc + "\u6d88\u8017" + apCost + "\u70b9\uff0c\u5269\u4f59" + apRemaining + "\u70b9", "info");
        updateAPDisplay();
      } else {
        lastAPCost = 0;
      }
      // 保存AP状态到快照
      snapshot.apEnabled = apEnabled;
      snapshot.apRemaining = apRemaining;
      snapshot.apMax = apMax;
      snapshot.lastAPCost = lastAPCost;

nst snapshot = {
        board: board.map(row => row.map(cell => cell ? { ...cell } : null)),
        tianJiangs: tianJiangs.map(tj => ({ ...tj })),
        giants: giants.map(g => ({ ...g })),
        stackedDancers: stackedDancers.map(d => ({ ...d })),
        currentPlayer: currentPlayer,
        deadPoolBlack: [...deadPoolBlack],
        deadPoolRed: [...deadPoolRed]
      };
      historyStack.push(snapshot);
      if (historyStack.length > MAX_HISTORY) historyStack.shift();

      // 下面原有的移动逻辑...
      if(move.type==='stackedDancer') {
        const {dancer, toRow, toCol} = move;
        const target = board[toRow-ROW_MIN]?.[toCol-COL_MIN];
        if(target && target.color!==color) return false;
        board[toRow-ROW_MIN][toCol-COL_MIN] = {name:'舞', color:color};
        const idx = stackedDancers.indexOf(dancer);
        if(idx > -1) stackedDancers.splice(idx, 1);
        countPieces(); return true;
      }
      if (move.type === 'tianjiang') {
        const t = move.tj;
        const oldRow = t.row, oldLeft = t.leftCol, oldRight = t.rightCol;
        const enemy = color === RED ? BLACK : RED;

        // 彻底清理旧位置
        if (t.isHalved) {
          if (board[oldRow - ROW_MIN]?.[oldLeft - COL_MIN]) {
            board[oldRow - ROW_MIN][oldLeft - COL_MIN] = null;
          }
        } else {
          if (board[oldRow - ROW_MIN]?.[oldLeft - COL_MIN]?.name?.startsWith('天将')) {
            board[oldRow - ROW_MIN][oldLeft - COL_MIN] = null;
          }
          if (board[oldRow - ROW_MIN]?.[oldRight - COL_MIN]?.name?.startsWith('天将')) {
            board[oldRow - ROW_MIN][oldRight - COL_MIN] = null;
          }
        }

        const newRow = move.toRow;
        const newLeft = move.toLeftCol;
        const newRight = newLeft + 1;
        const newCells = t.isHalved
          ? [{ row: newRow, col: newLeft }]
          : [{ row: newRow, col: newLeft }, { row: newRow, col: newRight }];

        // 吃子处理（包含敌方天将）
        if (move.isEat) {
          let hasEaten = false; // 是否真的吃到了棋子
          newCells.forEach(c => {
            // 普通棋子
            const target = board[c.row - ROW_MIN]?.[c.col - COL_MIN];
            if (target && target.color === enemy) {
              if (REVIVABLE_TYPES.includes(target.name)) {
                const pool = target.color === BLACK ? deadPoolBlack : deadPoolRed;
                pool.push(target.name);
              }
              board[c.row - ROW_MIN][c.col - COL_MIN] = null;
              hasEaten = true;
            }
            // 敌方天将
            const enemyTJ = tianJiangs.find(etj =>
              etj.color === enemy &&
              etj.row === c.row &&
              (etj.leftCol === c.col || etj.rightCol === c.col)
            );
            if (enemyTJ) {
              // 判断是否完全正对且纵向紧邻
              const attackerLeft = t.leftCol;   // 移动前天将左列
              const attackerRight = t.rightCol; // 移动前天将右列
              const defenderLeft = enemyTJ.leftCol;
              const defenderRight = enemyTJ.rightCol;
              const dr = c.row - t.row; // 行数差
              const isAligned = (attackerLeft === defenderLeft && attackerRight === defenderRight);
              const isAdjacentVertical = (dr === 1 || dr === -1);
              const isFrontalAssault = isAligned && isAdjacentVertical;

              if (isFrontalAssault) {
                enemyTJ.hp = 0; // 强杀
              } else {
                enemyTJ.hp--;
              }

              if (enemyTJ.hp > 0 && !enemyTJ.isHalved) {
                // 受伤缩为一格
                enemyTJ.isHalved = true;
                const otherCol = (c.col === enemyTJ.leftCol) ? enemyTJ.rightCol : enemyTJ.leftCol;
                if (board[enemyTJ.row - ROW_MIN]?.[otherCol - COL_MIN]) {
                  board[enemyTJ.row - ROW_MIN][otherCol - COL_MIN] = null;
                }
                enemyTJ.leftCol = otherCol;
                enemyTJ.rightCol = otherCol;
                log(`${enemyTJ.color === RED ? '红' : '黑'}方天将${enemyTJ.type}受创，缩为一格！`, 'warn');
              } else if (enemyTJ.hp <= 0) {
                // 死亡
                log(`${enemyTJ.color === RED ? '红' : '黑'}方天将${enemyTJ.type}被击杀！`, 'warn');
                if (!enemyTJ.isHalved) {
                  const otherCol = (c.col === enemyTJ.leftCol) ? enemyTJ.rightCol : enemyTJ.leftCol;
                  if (board[enemyTJ.row - ROW_MIN]?.[otherCol - COL_MIN]) {
                    board[enemyTJ.row - ROW_MIN][otherCol - COL_MIN] = null;
                  }
                }
                tianJiangs.splice(tianJiangs.indexOf(enemyTJ), 1);
              }
              hasEaten = true;
            }
          });

          // 真将首次吃子升级（只要吃到了棋子，无论类型）
          if (hasEaten && t.type === '真' && !t.isUpgraded) {
            t.isUpgraded = true;
            log(`⚡ 天将真首次吃子，升级为大将！`, 'info');
          }
        }

        // 放置天将到新位置
        newCells.forEach(c => {
          board[c.row - ROW_MIN][c.col - COL_MIN] = { name: '天将' + t.type, color: color };
        });

        // 更新坐标
        t.row = newRow;
        t.leftCol = newLeft;
        t.rightCol = t.isHalved ? newLeft : newRight;
            
      } else if(move.type==='giant') {
        const g = move.giant;
        const oldTR = g.topLeftRow, oldTC = g.topLeftCol;
        const enemy = color === RED ? BLACK : RED;

        // 清理旧位置的 board 标记（只清除巨将自己的格子）
        for (let dr = 0; dr < 2; dr++) {
          for (let dc = 0; dc < 2; dc++) {
            const ir = oldTR + dr - ROW_MIN, ic = oldTC + dc - COL_MIN;
            if (ir >= 0 && ir < ROWS && ic >= 0 && ic < COLS) {
              const cellPiece = board[ir][ic];
              if (cellPiece && cellPiece.name === '巨将') {
                board[ir][ic] = null;
              }
            }
          }
        }

        // 移动巨将到新位置
        g.topLeftRow = move.toRow;
        g.topLeftCol = move.toCol;

        // 收集新位置下的敌方棋子
        const enemiesUnderGiant = [];
        for (let dr = 0; dr < 2; dr++) {
          for (let dc = 0; dc < 2; dc++) {
            const tr = g.topLeftRow + dr, tc = g.topLeftCol + dc;
            if (tr < ROW_MIN || tr > ROW_MAX || tc < COL_MIN || tc > COL_MAX) continue;
            const tp = board[tr - ROW_MIN]?.[tc - COL_MIN];
            if (tp && tp.color === enemy) {
              enemiesUnderGiant.push({row: tr, col: tc, piece: tp});
            }
          }
        }

        // 吃子：如果敌方棋子数量<=3，全部吃掉；如果>3，随机选3个
        if (enemiesUnderGiant.length > 0) {
          const toEat = enemiesUnderGiant.length <= 3 ? enemiesUnderGiant
            : enemiesUnderGiant.sort(() => Math.random() - 0.5).slice(0, 3);
          toEat.forEach(({row, col, piece}) => {
            if (REVIVABLE_TYPES.includes(piece.name)) {
              const pool = piece.color === BLACK ? deadPoolBlack : deadPoolRed;
              pool.push(piece.name);
            }
            board[row - ROW_MIN][col - COL_MIN] = null;
          });
          // 如果吃掉了敌方天将，也需要处理（天将不在 board 上，不会被覆盖到，但巨将不会覆盖天将，所以暂不处理）
          log(`💥 巨将碾压！吃掉了 ${toEat.length} 枚敌方棋子`, 'info');
        }

        // 放置巨将标记到新位置（只覆盖空格或敌方格子）
        for (let dr = 0; dr < 2; dr++) {
          for (let dc = 0; dc < 2; dc++) {
            const ir = g.topLeftRow + dr - ROW_MIN, ic = g.topLeftCol + dc - COL_MIN;
            if (ir >= 0 && ir < ROWS && ic >= 0 && ic < COLS) {
              const cellPiece = board[ir][ic];
              if (!cellPiece || cellPiece.color !== color) {
                board[ir][ic] = {name:'巨将', color: color};
              }
            }
          }
        }
      } else {
        const piece = board[move.fromRow - ROW_MIN][move.fromCol - COL_MIN];
        const target = board[move.toRow - ROW_MIN]?.[move.toCol - COL_MIN];

        // 优先检查是否攻击了天将
        const attackedTianJiang = tianJiangs.find(tj =>
          tj.color !== color &&
          ((tj.row === move.toRow && tj.leftCol === move.toCol) ||
           (tj.row === move.toRow && tj.rightCol === move.toCol))
        );

        if (attackedTianJiang) {
          attackedTianJiang.hp--;
          if (attackedTianJiang.hp > 0 && !attackedTianJiang.isHalved) {
            // 半血：退到未被攻击的另一格
            attackedTianJiang.isHalved = true;
            const surviveCol = (move.toCol === attackedTianJiang.leftCol)
              ? attackedTianJiang.rightCol
              : attackedTianJiang.leftCol;
            const oldL = attackedTianJiang.leftCol, oldR = attackedTianJiang.rightCol;
            if (board[attackedTianJiang.row - ROW_MIN]?.[oldL - COL_MIN]) {
              board[attackedTianJiang.row - ROW_MIN][oldL - COL_MIN] = null;
            }
            if (board[attackedTianJiang.row - ROW_MIN]?.[oldR - COL_MIN]) {
              board[attackedTianJiang.row - ROW_MIN][oldR - COL_MIN] = null;
            }
            attackedTianJiang.leftCol = surviveCol;
            attackedTianJiang.rightCol = surviveCol;
            board[move.toRow - ROW_MIN][move.toCol - COL_MIN] = piece;
            board[move.fromRow - ROW_MIN][move.fromCol - COL_MIN] = null;
            log(`${attackedTianJiang.color === RED ? '红' : '黑'}方天将${attackedTianJiang.type}受创，缩为一格！`, 'warn');
          } else if (attackedTianJiang.hp <= 0) {
            log(`${attackedTianJiang.color === RED ? '红' : '黑'}方天将${attackedTianJiang.type}被击杀！`, 'warn');
            if (!attackedTianJiang.isHalved) {
              const otherCol = (move.toCol === attackedTianJiang.leftCol)
                ? attackedTianJiang.rightCol : attackedTianJiang.leftCol;
              if (board[attackedTianJiang.row - ROW_MIN]?.[otherCol - COL_MIN]) {
                board[attackedTianJiang.row - ROW_MIN][otherCol - COL_MIN] = null;
              }
            }
            tianJiangs.splice(tianJiangs.indexOf(attackedTianJiang), 1);
            board[move.toRow - ROW_MIN][move.toCol - COL_MIN] = piece;
            board[move.fromRow - ROW_MIN][move.fromCol - COL_MIN] = null;
          }

        // 检查是否攻击了巨将（必须在天将处理之后，用 else if 避免同时触发）
        } else if (true) { // 用 else if 保持结构，下面定义 attackedGiant
          const attackedGiant = giants.find(g =>
            g.color !== color &&
            g.topLeftRow <= move.toRow && move.toRow <= g.topLeftRow + 1 &&
            g.topLeftCol <= move.toCol && move.toCol <= g.topLeftCol + 1
          );
          if (attackedGiant) {
            attackedGiant.hp--;
            log(`💢 巨将受创！剩余生命：${attackedGiant.hp}`, 'warn');
            if (attackedGiant.hp <= 0) {
              log(`💀 巨将崩毁！`, 'warn');
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
          } else {
            // 普通吃子（无天将、无巨将）
            if (target && target.color !== color) {
              if (REVIVABLE_TYPES.includes(target.name)) {
                const p = target.color === BLACK ? deadPoolBlack : deadPoolRed;
                p.push(target.name);
              }
            }
            board[move.toRow - ROW_MIN][move.toCol - COL_MIN] = piece;
            board[move.fromRow - ROW_MIN][move.fromCol - COL_MIN] = null;
          }
        }
      }
      countPieces();
      if (checkGameEnd()) return true;
      return true;
    } catch(e) { log(`❌ 走法异常: ${e.message}`, 'error'); return false; }
  }

export { applyMove };
