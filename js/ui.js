((
{{
// ===== 界面渲染 =====
import { ROW_MIN, ROW_MAX, COL_MIN, COL_MAX, ROWS, COLS, LINE_SPAN, PADDING,
  RED, BLACK, RED_COLOR, BLACK_COLOR, REVIVABLE_TYPES, bridgeCells, bridgeSet,
  pieceValues, ruleMap, medicalBlack, medicalRed, isYuBridge,
  apEnabled, apRemaining, apMax, updateAPDisplay } from "./data.js";
import { board, tianJiangs, giants, stackedDancers, currentPlayer,
  selectedPiece, validMoves, dangerMoves, deadPoolBlack, deadPoolRed,
  historyStack, checkWinner, countPieces } from "./gameState.js";
import { isBridge, generateMoves, isTianJiangInCheck } from "./moveGen.js";
import { applyMove } from "./apply.js";
import { log, logPanel, statusBar } from "./log.js";

const canvas = document.getElementById('chessCanvas');
const tooltip = document.getElementById('tooltip');
const tooltipCoord = document.getElementById('tooltipCoord');
const tooltipPiece = document.getElementById('tooltipPiece');
const tooltipRule = document.getElementById('tooltipRule');
const boardContainer = document.getElementById('boardContainer');
const blackCountEl = document.getElementById('blackCount');
const redCountEl = document.getElementById('redCount');
const el = document.getElementById("apDisplay");
const canvas = document.getElementById('chessCanvas');

  function getX(c) { return PADDING + (c - COL_MIN) * LINE_SPAN; }

  function getY(r) { return PADDING + (r - ROW_MIN) * LINE_SPAN; }

  function drawBoard() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
updateAPDisplay();
    ctx.fillStyle = '#fff9ef'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='#777'; ctx.lineWidth=1;
    for(let r=0; r<ROWS; r++){const y=getY(ROW_MIN+r); ctx.beginPath(); ctx.moveTo(PADDING,y); ctx.lineTo(canvas.width-PADDING,y); ctx.stroke();}
    for(let c=0; c<COLS; c++){const x=getX(COL_MIN+c); ctx.beginPath(); ctx.moveTo(x,PADDING); ctx.lineTo(x,canvas.height-PADDING); ctx.stroke();}
          
          // 河界背景：紧贴行7的线和行10的线（使用格点坐标）
    const riverTop = getY(7);      // 行7的线
    const riverBottom = getY(10);  // 行10的线
    ctx.fillStyle = '#1e5f7a';
    ctx.globalAlpha = 0.25;
    ctx.fillRect(PADDING, riverTop, canvas.width - 2 * PADDING, riverBottom - riverTop);
    ctx.globalAlpha = 1;

    // 河界文字放在两条线正中间
    const riverCenterY = (riverTop + riverBottom) / 2;
    ctx.font = `bold ${LINE_SPAN * 1.0}px 'KaiTi'`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#1a3a4a';
    ctx.shadowBlur = 10;
    ctx.fillText('楚  河', canvas.width * 0.3, riverCenterY);
    ctx.fillText('汉  界', canvas.width * 0.55, riverCenterY);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#1e5f7a';
    ctx.globalAlpha = 0.9;
    ctx.fillText('楚  河', canvas.width * 0.3, riverCenterY);
    ctx.fillText('汉  界', canvas.width * 0.55, riverCenterY);
    ctx.globalAlpha = 1;
    // 绘制桥标记
    bridgeCells.forEach(b => {
      const x = getX(b.col), y = getY(b.row);
      ctx.fillStyle = '#b89c6c';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x - LINE_SPAN*0.4, y - LINE_SPAN*0.15, LINE_SPAN*0.8, LINE_SPAN*0.3);
      ctx.globalAlpha = 1;
      if (isYuBridge(b.col)) {
        ctx.fillStyle = '#ffd700';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x - LINE_SPAN*0.35, y - LINE_SPAN*0.1, LINE_SPAN*0.7, LINE_SPAN*0.2);
        ctx.globalAlpha = 1;
      }
    });
    validMoves.forEach(m => {
      const x = getX(m.col), y = getY(m.row);
      ctx.beginPath(); ctx.arc(x, y, LINE_SPAN*0.15, 0, 2*Math.PI);
      ctx.fillStyle = (selectedPiece && selectedPiece.color===BLACK) ? '#000000' : '#b91c1c';
      ctx.fill(); ctx.strokeStyle = '#ffe0b5'; ctx.lineWidth = 1; ctx.stroke();
    });

    // 绘制危险移动点（白色）
    dangerMoves.forEach(m => {
      const x = getX(m.col), y = getY(m.row);
      ctx.beginPath(); ctx.arc(x, y, LINE_SPAN*0.15, 0, 2*Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
    
    medicalBlack.forEach(m=>{ const x=getX(m.col),y=getY(m.row); ctx.fillStyle='#cce0ff'; ctx.globalAlpha=0.5; ctx.fillRect(x,y,LINE_SPAN,LINE_SPAN); ctx.globalAlpha=1; ctx.strokeStyle='#b91c1c'; ctx.lineWidth=3; ctx.fillStyle='#b91c1c'; ctx.beginPath(); ctx.moveTo(x+LINE_SPAN*0.2,y+LINE_SPAN*0.35); ctx.lineTo(x+LINE_SPAN*0.8,y+LINE_SPAN*0.5); ctx.lineTo(x+LINE_SPAN*0.2,y+LINE_SPAN*0.65); ctx.fill(); });
    medicalRed.forEach(m=>{ const x=getX(m.col),y=getY(m.row); ctx.fillStyle='#cce0ff'; ctx.globalAlpha=0.5; ctx.fillRect(x,y,LINE_SPAN,LINE_SPAN); ctx.globalAlpha=1; ctx.strokeStyle='#b91c1c'; ctx.lineWidth=3; ctx.fillStyle='#b91c1c'; ctx.beginPath(); ctx.moveTo(x+LINE_SPAN*0.8,y+LINE_SPAN*0.35); ctx.lineTo(x+LINE_SPAN*0.2,y+LINE_SPAN*0.5); ctx.lineTo(x+LINE_SPAN*0.8,y+LINE_SPAN*0.65); ctx.fill(); });

    tianJiangs.forEach(t=>{
      if (t.isHalved) {
        // 半血天将：画标准圆形（加粗边框表示受伤）
        const x = getX(t.leftCol), y = getY(t.row);
        ctx.beginPath(); ctx.arc(x, y, LINE_SPAN*0.38, 0, 2*Math.PI);
        ctx.fillStyle = t.color===RED ? RED_COLOR : BLACK_COLOR;
        ctx.fill();
        ctx.strokeStyle = '#ffe0b5';
        ctx.lineWidth = 3;  // 加粗边框
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${LINE_SPAN*0.3}px KaiTi`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`天将${t.type}`, x, y);
      } else {
        // 正常天将：画椭圆（原来的绘制方式）
        const cx=(getX(t.leftCol)+getX(t.rightCol))/2, cy=getY(t.row);
        ctx.beginPath(); ctx.ellipse(cx,cy,LINE_SPAN*1.0,LINE_SPAN*0.55,0,0,Math.PI*2);
        ctx.fillStyle=t.color===RED?RED_COLOR:BLACK_COLOR; ctx.fill();
        ctx.strokeStyle='#ffe0b5'; ctx.lineWidth=2.5; ctx.stroke();
        ctx.fillStyle='#fff';
        ctx.font=`bold ${LINE_SPAN*0.5}px KaiTi`;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(`天将${t.type}`,cx,cy);
      }
    });
    giants.forEach(g=>{
      const cx=(getX(g.topLeftCol)+getX(g.topLeftCol+1))/2, cy=(getY(g.topLeftRow)+getY(g.topLeftRow+1))/2;
      ctx.beginPath(); ctx.arc(cx,cy,LINE_SPAN*0.85,0,2*Math.PI);
      ctx.fillStyle=g.color===RED?RED_COLOR:BLACK_COLOR; ctx.fill();
      const hpBorderColor = g.hp > 2 ? "#4caf50" : g.hp > 1 ? "#ff9800" : "#f44336";
      const hpBorderWidth = g.hp > 2 ? 4 : g.hp > 1 ? 5 : 6;
      ctx.strokeStyle = hpBorderColor;
      ctx.lineWidth = hpBorderWidth;
      ctx.stroke();
      ctx.strokeStyle = "#ffe0b5";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='bold '+LINE_SPAN*0.5+'px KaiTi';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText("巨将",cx,cy);
      const barW = LINE_SPAN * 1.8;
      const barH = LINE_SPAN * 0.3;
      const barX = cx - barW / 2;
      const barY = cy - LINE_SPAN * 0.85 - barH - 6;
      ctx.fillStyle = "#333";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.fillRect(barX-2, barY-2, barW+4, barH+4);
      ctx.shadowBlur = 0;
      const hpRatio = Math.max(0, g.hp / 4);
      const hpGradient = ctx.createLinearGradient(barX, barY, barX+barW, barY);
      if (g.hp > 2) {
        hpGradient.addColorStop(0, "#66bb6a");
        hpGradient.addColorStop(1, "#388e3c");
      } else if (g.hp > 1) {
        hpGradient.addColorStop(0, "#ffa726");
        hpGradient.addColorStop(1, "#ef6c00");
      } else {
        hpGradient.addColorStop(0, "#ef5350");
        hpGradient.addColorStop(1, "#b71c1c");
      }
      ctx.fillStyle = hpGradient;
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.fillStyle = "#fff";
      ctx.font = 'bold ' + Math.floor(LINE_SPAN*0.22) + 'px monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 3;
      ctx.fillText(g.hp + '/4', cx, barY + barH/2);
      ctx.shadowBlur = 0;
    });

    for(let r=0; r<ROWS; r++) for(let c=0; c<COLS; c++) {
      // \u9ad8\u4eae\u9009\u4e2d\u68cb\u5b50\u8fb9\u6846
      if (selectedPiece && selectedPiece.type === "board" && selectedPiece.row === ROW_MIN+r && selectedPiece.col === COL_MIN+c) {
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(getX(COL_MIN+c),getY(ROW_MIN+r),LINE_SPAN*0.45,0,2*Math.PI); ctx.stroke();
      }
      const piece=board[r][c]; if(!piece || piece.name==='巨将') continue;
      
      // 检查这个格子是不是被某个天将占据（如果是，椭圆绘制已经画过了，这里跳过）
      const isTianJiangCell = tianJiangs.some(tj => {
        if (tj.isHalved) {
          return tj.row === ROW_MIN + r && tj.leftCol === COL_MIN + c;
        } else {
          return (tj.row === ROW_MIN + r && tj.leftCol === COL_MIN + c) ||
                 (tj.row === ROW_MIN + r && tj.rightCol === COL_MIN + c);
        }
      });
      if (isTianJiangCell) continue;
      
      const x=getX(COL_MIN+c), y=getY(ROW_MIN+r);
      ctx.beginPath(); ctx.arc(x,y,LINE_SPAN*0.38,0,2*Math.PI);
      ctx.fillStyle=piece.color===RED?RED_COLOR:BLACK_COLOR; ctx.fill();
      ctx.strokeStyle='#ffe0b5'; ctx.lineWidth=2; ctx.stroke();
      if (selectedPiece && selectedPiece.type==='board' && selectedPiece.row===ROW_MIN+r && selectedPiece.col===COL_MIN+c) { ctx.lineWidth = 4; ctx.strokeStyle = '#fbbf24'; ctx.stroke(); }
      ctx.fillStyle='#fff'; ctx.font=`bold ${LINE_SPAN*0.3}px KaiTi`; ctx.textAlign='center'; ctx.textBaseline='middle';
      let dn = piece.name;
      if(stackedDancers.find(d=>d.row===ROW_MIN+r && d.col===COL_MIN+c) && piece.name==='炮') dn='炮+舞';
      ctx.fillText(dn, x, y);
    }

  }

    const rect = canvas.getBoundingClientRect(), scaleX = canvas.width/rect.width, scaleY = canvas.height/rect.height;
    const mx = (e.clientX-rect.left)*scaleX, my = (e.clientY-rect.top)*scaleY;
    const logicCol = Math.round((mx-PADDING)/LINE_SPAN+COL_MIN), logicRow = Math.round((my-PADDING)/LINE_SPAN+ROW_MIN);
    if (logicRow<ROW_MIN||logicRow>ROW_MAX||logicCol<COL_MIN||logicCol>COL_MAX) return;
    // 巨将选择
    for (const g of giants) { const cx=(getX(g.topLeftCol)+getX(g.topLeftCol+1))/2, cy=(getY(g.topLeftRow)+getY(g.topLeftRow+1))/2; if ((mx-cx)**2+(my-cy)**2<=(LINE_SPAN*0.85)**2) { selectedPiece={type:'giant', topLeftRow:g.topLeftRow, topLeftCol:g.topLeftCol, color:g.color}; validMoves=generateMoves(currentPlayer).filter(m=>m.type==='giant'&&m.giant.topLeftRow===g.topLeftRow&&m.giant.topLeftCol===g.topLeftCol).flatMap(m=>[{row:m.toRow,col:m.toCol},{row:m.toRow,col:m.toCol+1},{row:m.toRow+1,col:m.toCol},{row:m.toRow+1,col:m.toCol+1}]); dangerMoves=[]; drawBoard(); return; } }
    // 叠舞选择
    for (const d of stackedDancers) { if(d.row===logicRow && d.col===logicCol) { selectedPiece={type:'stackedDancer', dancer:d, color:d.color}; validMoves=generateMoves(currentPlayer).filter(m=>m.type==='stackedDancer'&&m.dancer===d).map(m=>({row:m.toRow,col:m.toCol})); dangerMoves=[]; drawBoard(); return; } }
    // ★ 优先处理天将互吃（必须在 piece 取 null 之前）
    if (selectedPiece) {
      const hoveredEnemyTJ = tianJiangs.find(tj => {
        if (tj.color === currentPlayer) return false;
        const cx = (getX(tj.leftCol) + getX(tj.rightCol)) / 2;
        const cy = getY(tj.row);
        return tj.isHalved
          ? (mx - cx) ** 2 + (my - cy) ** 2 <= (LINE_SPAN * 0.38) ** 2
          : (mx - cx) ** 2 / (LINE_SPAN * 1.0) ** 2 + (my - cy) ** 2 / (LINE_SPAN * 0.55) ** 2 <= 1;
      });
      if (hoveredEnemyTJ) {
        const tj = hoveredEnemyTJ;
        // 使用实际点击的格子列作为攻击目标，确保点哪打哪
        let colsToTry = [];
        if (logicCol === tj.leftCol || logicCol === tj.rightCol) {
          colsToTry.push(logicCol);
        } else {
          // 四舍五入后不在天将格内（比如点在两格交界），两格都试试
          colsToTry.push(tj.leftCol, tj.rightCol);
        }
        let attackMove = null;
        for (const col of colsToTry) {
          attackMove = generateMoves(currentPlayer).find(m => {
            if (!m.isEat) return false;
            // 普通棋子吃天将
            if (m.type === 'piece' && selectedPiece.type === 'board' &&
                m.fromRow === selectedPiece.row && m.fromCol === selectedPiece.col &&
                m.toRow === tj.row && m.toCol === col) return true;
            // 天将吃天将（支持两格吃法）
            if (m.type === 'tianjiang' && selectedPiece.type === 'tianjiang' &&
                m.tj === selectedPiece.tj && m.toRow === tj.row &&
                (m.toLeftCol === col || (!selectedPiece.tj.isHalved && m.toLeftCol + 1 === col))) return true;
            // 巨将吃天将
            if (m.type === 'giant' && selectedPiece.type === 'giant' &&
                m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol &&
                m.toRow === tj.row && m.toCol === col) return true;
            return false;
          });
          if (attackMove) break; // 找到就停止
        }
        if (attackMove) {
          if (applyMove(attackMove, currentPlayer)) {
            currentPlayer = currentPlayer === RED ? BLACK : RED;
            selectedPiece = null;
            validMoves = [];
            dangerMoves = [];
            drawBoard();
            statusBar.textContent = `手动移动完成，轮到${currentPlayer === 'red' ? '红' : '黑'}方`;
            return;
          }
        }
      }
    }
    const r=logicRow-ROW_MIN, c=logicCol-COL_MIN; const piece=board[r]?.[c];
    // 如果已选中己方棋子，且点击的是敌方棋子，优先尝试吃子移动
    if (selectedPiece && piece && piece.color !== currentPlayer && piece.name !== '巨将'){
      const move = generateMoves(currentPlayer).find(m => {
        if (m.type === 'piece' && selectedPiece.type === 'board' && m.fromRow === selectedPiece.row && m.fromCol === selectedPiece.col && m.toRow === logicRow && m.toCol === logicCol) return true;
        if (m.type === 'tianjiang' && selectedPiece.type === 'tianjiang' && m.tj === selectedPiece.tj && m.toRow === logicRow && (m.toLeftCol === logicCol || (!selectedPiece.tj.isHalved && m.toLeftCol + 1 === logicCol)) && m.isEat) return true;
        if (m.type === 'giant' && selectedPiece.type === 'giant' && m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol && m.toRow === logicRow && m.toCol === logicCol) return true;
        if (m.type === 'stackedDancer' && selectedPiece.type === 'stackedDancer' && m.dancer === selectedPiece.dancer && m.toRow === logicRow && m.toCol === logicCol) return true;
        return false;
      });
      if (move) {
        if (applyMove(move, currentPlayer)) {
          currentPlayer = currentPlayer === RED ? BLACK : RED;
          selectedPiece = null;
          validMoves = [];
          dangerMoves = [];
          drawBoard();
          statusBar.textContent = `手动移动完成，轮到${currentPlayer === 'red' ? '红' : '黑'}方`;
          return;
        }
      }
    }
    // 点击普通己方棋子（非天将），选中并计算危险点
      if(piece && piece.color === currentPlayer && piece.name!=='巨将'&& !piece.name.startsWith('天将')) { 
      if(selectedPiece?.type==='board'&&selectedPiece.row===logicRow&&selectedPiece.col===logicCol) {selectedPiece=null; validMoves=[]; dangerMoves=[]; drawBoard(); return;} 
      selectedPiece={type:'board', row:logicRow, col:logicCol, color:piece.color};
      validMoves=generateMoves(currentPlayer).filter(m=>m.type==='piece'&&m.fromRow===logicRow&&m.fromCol===logicCol).map(m=>({row:m.toRow,col:m.toCol}));
      // 计算危险移动点（保存并恢复目标格棋子）
      dangerMoves = [];
      const testPiece = board[logicRow-ROW_MIN]?.[logicCol-COL_MIN];
      if (testPiece) {
        const savedBoard = board[logicRow-ROW_MIN][logicCol-COL_MIN];
        for (const mv of validMoves) {
          const targetPiece = board[mv.row-ROW_MIN]?.[mv.col-COL_MIN];
          board[logicRow-ROW_MIN][logicCol-COL_MIN] = null;
          board[mv.row-ROW_MIN][mv.col-COL_MIN] = testPiece;
          const enemyColor = currentPlayer === RED ? BLACK : RED;
          let underAttack = false;
          for (let ri = 0; ri < ROWS && !underAttack; ri++) {
            for (let ci = 0; ci < COLS && !underAttack; ci++) {
              const ep = board[ri][ci];
              if (ep && ep.color === enemyColor) {
                if (canPieceAttackCell(ep, ROW_MIN+ri, COL_MIN+ci, mv.row, mv.col)) {
                  underAttack = true;
                }
              }
            }
          }
          if (!underAttack) {
            for (const etj of tianJiangs) {
              if (etj.color === enemyColor) {
                const cells = etj.isHalved ? [{row: etj.row, col: etj.leftCol}] : [{row: etj.row, col: etj.leftCol}, {row: etj.row, col: etj.rightCol}];
                for (const cell of cells) {
                  if (canTianJiangAttackCell(etj, cell.row, cell.col, mv.row, mv.col)) { underAttack = true; break; }
                }
              }
            }
          }
          if (underAttack) dangerMoves.push(mv);
          board[mv.row-ROW_MIN][mv.col-COL_MIN] = targetPiece;
          board[logicRow-ROW_MIN][logicCol-COL_MIN] = savedBoard;
        }
      }
      drawBoard(); return; 
    }
    // 处理己方棋子攻击敌方天将（天将互吃）
    if (selectedPiece) {
      // 精确判断鼠标是否在敌方天将身上
      const hoveredEnemyTJ = tianJiangs.find(tj => {
        if (tj.color === currentPlayer) return false;
        const cx = (getX(tj.leftCol) + getX(tj.rightCol)) / 2;
        const cy = getY(tj.row);
        return tj.isHalved
          ? (mx - cx) ** 2 + (my - cy) ** 2 <= (LINE_SPAN * 0.38) ** 2
          : (mx - cx) ** 2 / (LINE_SPAN * 1.0) ** 2 + (my - cy) ** 2 / (LINE_SPAN * 0.55) ** 2 <= 1;
      });
      if (hoveredEnemyTJ) {
        const tj = hoveredEnemyTJ;
        const attackMove = generateMoves(currentPlayer).find(m => {
          if (!m.isEat) return false;
          // 普通棋子吃天将
          if (m.type === 'piece' && selectedPiece.type === 'board' &&
              m.fromRow === selectedPiece.row && m.fromCol === selectedPiece.col &&
              m.toRow === tj.row && (m.toCol === tj.leftCol || m.toCol === tj.rightCol)) return true;
          // 天将吃天将
          if (m.type === 'tianjiang' && selectedPiece.type === 'tianjiang' &&
              m.tj === selectedPiece.tj && m.toRow === tj.row &&
              (m.toLeftCol === tj.leftCol || m.toLeftCol === tj.rightCol ||
               (!selectedPiece.tj.isHalved && (m.toLeftCol + 1 === tj.leftCol || m.toLeftCol + 1 === tj.rightCol)))) return true;
          // 巨将吃天将
          if (m.type === 'giant' && selectedPiece.type === 'giant' &&
              m.giant.topLeftRow === selectedPiece.topLeftRow && m.giant.topLeftCol === selectedPiece.topLeftCol &&
              m.toRow === tj.row && (m.toCol === tj.leftCol || m.toCol === tj.rightCol)) return true;
          return false;
        });
        if (attackMove) {
          if (applyMove(attackMove, currentPlayer)) {
            currentPlayer = currentPlayer === RED ? BLACK : RED;
            selectedPiece = null;
            validMoves = [];
            dangerMoves = [];
            drawBoard();
            statusBar.textContent = `手动移动完成，轮到${currentPlayer === 'red' ? '红' : '黑'}方`;
            return;
          }
        }
      }
    }
    // 点击空格移动
    if(selectedPiece && !piece) {
      const move = generateMoves(currentPlayer).find(m=>{
        if(m.type==='piece'&&m.fromRow===selectedPiece.row&&m.fromCol===selectedPiece.col&&m.toRow===logicRow&&m.toCol===logicCol) return true;
        if(m.type==='tianjiang'&&selectedPiece.type==='tianjiang'&&m.tj===selectedPiece.tj&&m.toRow===logicRow&&(m.toLeftCol===logicCol||(!selectedPiece.tj.isHalved&&m.toLeftCol+1===logicCol))) return true;
        if(m.type==='giant'&&selectedPiece.type==='giant'&&m.giant.topLeftRow===selectedPiece.topLeftRow&&m.giant.topLeftCol===selectedPiece.topLeftCol&&m.toRow===logicRow&&m.toCol===logicCol) return true;
        if(m.type==='stackedDancer'&&selectedPiece.type==='stackedDancer'&&m.dancer===selectedPiece.dancer&&m.toRow===logicRow&&m.toCol===logicCol) return true;
        return false;
      });
      if(move) { applyMove(move, currentPlayer); currentPlayer = currentPlayer===RED?BLACK:RED; selectedPiece=null; validMoves=[]; dangerMoves=[]; drawBoard(); statusBar.textContent=`手动移动完成，轮到${currentPlayer==='red'?'红':'黑'}方`; return; }
    } 
    // 天将点击处理（放在最后，不拦截吃子）
    for (const tj of tianJiangs) {
      // 半血用圆形碰撞，正常用椭圆碰撞
      const cx = (getX(tj.leftCol) + getX(tj.rightCol)) / 2;
      const cy = getY(tj.row);
      const hit = tj.isHalved
        ? (mx - cx) ** 2 + (my - cy) ** 2 <= (LINE_SPAN * 0.38) ** 2
        : (mx - cx) ** 2 / (LINE_SPAN * 1.0) ** 2 + (my - cy) ** 2 / (LINE_SPAN * 0.55) ** 2 <= 1;
      if (!hit) continue;
      // 如果己方天将已选中，且点击位置在己方天将上，检查是否有可执行的吃子移动
      if (selectedPiece && selectedPiece.type === 'tianjiang' && selectedPiece.tj === tj && tj.color === currentPlayer) {
        // 尝试匹配吃子移动（目标可能是普通棋子或敌方天将）
        const targetCols = [logicCol];
        // 如果点击位置在天将的左右格之间，把两格都加入候选
        if (logicCol !== tj.leftCol && logicCol !== tj.rightCol) {
          targetCols.push(tj.leftCol, tj.rightCol);
        }
        let move = null;
        for (const col of targetCols) {
          move = generateMoves(currentPlayer).find(m =>
            m.type === 'tianjiang' && m.tj === tj && m.isEat &&
            m.toRow === logicRow && (m.toLeftCol === col || (!tj.isHalved && m.toLeftCol + 1 === col))
          );
          if (move) break;
        }
        if (move) {
          if (applyMove(move, currentPlayer)) {
            currentPlayer = currentPlayer === RED ? BLACK : RED;
            selectedPiece = null;
            validMoves = [];
            dangerMoves = [];
            drawBoard();
            statusBar.textContent = `手动移动完成，轮到${currentPlayer === 'red' ? '红' : '黑'}方`;
            return;
          }
        }
        // 即使没有吃子移动，也保留选中状态，不做任何事
        return;
      }
      // 敌方天将，且没有己方天将选中，直接跳过
      if (tj.color !== currentPlayer) continue;
      // 正常选中/取消选中己方天将
      if (selectedPiece?.type === 'tianjiang' && selectedPiece.tj === tj) {
        selectedPiece = null; validMoves = []; dangerMoves = []; drawBoard(); return;
      }
      // 选中己方天将，显示合法移动位置
      selectedPiece = { type: 'tianjiang', tj, color: tj.color };
      const tjMoves = generateMoves(currentPlayer).filter(m => m.type === 'tianjiang' && m.tj === tj);
      const cells = [];
      tjMoves.forEach(m => {
        cells.push({ row: m.toRow, col: m.toLeftCol });
        if (!tj.isHalved) cells.push({ row: m.toRow, col: m.toLeftCol + 1 });
      });
      validMoves = cells;
      // 计算危险移动点
      dangerMoves = [];
      if (tj.color === currentPlayer) {
        const savedLeft = tj.leftCol, savedRight = tj.rightCol, savedRow = tj.row, savedHalved = tj.isHalved;
        for (const mv of validMoves) {
          tj.row = mv.row; tj.leftCol = mv.col; tj.rightCol = tj.isHalved ? mv.col : mv.col + 1;
          const enemyColor = currentPlayer === RED ? BLACK : RED;
          let underAttack = false;
          for (let ri = 0; ri < ROWS && !underAttack; ri++) {
            for (let ci = 0; ci < COLS && !underAttack; ci++) {
              const ep = board[ri][ci];
              if (ep && ep.color === enemyColor) {
                if (canPieceAttackCell(ep, ROW_MIN+ri, COL_MIN+ci, mv.row, mv.col)) underAttack = true;
                if (!tj.isHalved && !underAttack && canPieceAttackCell(ep, ROW_MIN+ri, COL_MIN+ci, mv.row, mv.col+1)) underAttack = true;
              }
            }
          }
          if (!underAttack) {
            for (const etj of tianJiangs) {
              if (etj.color === enemyColor) {
                const ecells = etj.isHalved ? [{row: etj.row, col: etj.leftCol}] : [{row: etj.row, col: etj.leftCol}, {row: etj.row, col: etj.rightCol}];
                for (const ec of ecells) {
                  if (canTianJiangAttackCell(etj, ec.row, ec.col, mv.row, mv.col)) underAttack = true;
                  if (!tj.isHalved && !underAttack && canTianJiangAttackCell(etj, ec.row, ec.col, mv.row, mv.col+1)) underAttack = true;
                }
              }
            }
          }
          if (underAttack) dangerMoves.push(mv);
        }
        tj.row = savedRow; tj.leftCol = savedLeft; tj.rightCol = savedRight; tj.isHalved = savedHalved;
      }
      drawBoard();
      return;
    }
    selectedPiece=null; validMoves=[]; dangerMoves=[]; drawBoard();
  });
    const rect=canvas.getBoundingClientRect(), scaleX=canvas.width/rect.width, scaleY=canvas.height/rect.height;
    const mx=(e.clientX-rect.left)*scaleX, my=(e.clientY-rect.top)*scaleY;
    const logicCol=Math.round((mx-PADDING)/LINE_SPAN+COL_MIN), logicRow=Math.round((my-PADDING)/LINE_SPAN+ROW_MIN);
    if(logicRow<ROW_MIN||logicRow>ROW_MAX||logicCol<COL_MIN||logicCol>COL_MAX){tooltip.style.display='none';return;}
    let pieceName='', pieceColor='', ruleText='';
    const stacked = stackedDancers.find(d=>d.row===logicRow && d.col===logicCol);
    if(stacked) { pieceName='舞(叠放)'; pieceColor=stacked.color===RED?'红':'黑'; ruleText=ruleMap['舞']||''; }
    if(!pieceName) for(const tj of tianJiangs){ const cx=(getX(tj.leftCol)+getX(tj.rightCol))/2, cy=getY(tj.row); if((mx-cx)**2/(LINE_SPAN*1.0)**2+(my-cy)**2/(LINE_SPAN*0.55)**2<=1){ pieceName='天将'+tj.type; pieceColor=tj.color===RED?'红':'黑'; ruleText=ruleMap[pieceName]||''; break; } }
    if(!pieceName) for(const g of giants){ const cx=(getX(g.topLeftCol)+getX(g.topLeftCol+1))/2, cy=(getY(g.topLeftRow)+getY(g.topLeftRow+1))/2; if((mx-cx)**2+(my-cy)**2<=(LINE_SPAN*0.85)**2){ pieceName='巨将'; pieceColor=g.color===RED?'红':'黑'; ruleText=ruleMap['巨将']||''; break; } }
    if(!pieceName){ const r=logicRow-ROW_MIN, c=logicCol-COL_MIN; const piece=board[r]?.[c]; if(piece&&piece.name!=='巨将'){ pieceName=piece.name; pieceColor=piece.color===RED?'红':'黑'; ruleText=ruleMap[pieceName]||''; } else pieceName='空格'; }
    tooltip.style.display='block'; tooltip.style.left=(e.clientX+18)+'px'; tooltip.style.top=(e.clientY-50)+'px';
  });
export { drawBoard, getX, getY };
