// ===== AI与工具 =====
import { ROW_MIN, ROW_MAX, COL_MIN, COL_MAX, ROWS, COLS, LINE_SPAN, PADDING,
  RED, BLACK, RED_COLOR, BLACK_COLOR, REVIVABLE_TYPES, pieceValues,
  bridgeCells, bridgeSet, MAX_HISTORY,
  apEnabled, apMax, apRemaining, updateAPDisplay } from "./data.js";
import { board, tianJiangs, giants, stackedDancers, currentPlayer,
  selectedPiece, validMoves, dangerMoves, deadPoolBlack, deadPoolRed,
  historyStack, autoRunning, autoTimer, checkWinner, countPieces } from "./gameState.js";
import { log, statusBar } from "./log.js";
import { drawBoard, getX, getY } from "./ui.js";
import { generateMoves } from "./moveGen.js";
import { applyMove } from "./apply.js";

  function evaluateMove(move, color) {
    let score = 0;
    const toCol = move.toCol || move.toLeftCol;
    const toRow = move.toRow;
    if(move.isEat) {
      if(move.type==='piece') { const t = board[toRow-ROW_MIN]?.[toCol-COL_MIN]; score += (pieceValues[t?.name]||100)*10; }
      else if(move.type==='tianjiang') score += 500;
      else if(move.type==='giant') score += 2000;
    }
    score += (10 - Math.abs(toCol - 1)) * 2;
    score += Math.random() * 3;
    return score;
  }

  function selectBestMove(color) {
    const moves = generateMoves(color);
    if(moves.length===0) return null;
    const eat = moves.filter(m=>m.isEat);
    let cand = eat.length>0 ? eat : moves;
    let best=null, bestScore=-Infinity;
    cand.forEach(m=>{ const s=evaluateMove(m,color); if(s>bestScore){ bestScore=s; best=m; } });
    return best;
  }

  function autoStep() {
const savedAP = apEnabled; apEnabled = false;
    if(!autoRunning) return;
    const w = checkWinner(); if(w) { log(`🏆 ${w==='red'?'红':'黑'}方清场获胜！`, 'warn'); stopAuto(); return; }
    const move = selectBestMove(currentPlayer);
    if(!move) { log(`⚠️ 无合法走法，结束`, 'warn'); stopAuto(); return; }
    log(`🤖 ${currentPlayer==='red'?'红':'黑'}方: ${move.pieceName} ${move.isEat?'吃子!':''} 至 (${move.toRow||''},${move.toCol||move.toLeftCol||''})`);
    if(applyMove(move, currentPlayer)) { drawBoard(); if (apEnabled) { apRemaining = apMax; updateAPDisplay(); log('[AP] \u56de\u5408\u7ed3\u675f\uff0cAP\u91cd\u7f6e\u4e3a' + apMax + '\u70b9', 'info'); } currentPlayer = currentPlayer===RED?BLACK:RED; statusBar.textContent = `🤖 ${currentPlayer==='red'?'红':'黑'}方思考中...`; }
    else stopAuto();
  }

  function undoMove() {
    if (autoRunning) return;
    if (historyStack.length === 0) { log('没有可悔棋的步骤', 'warn'); return; }
    const snapshot = historyStack.pop();
    board = snapshot.board;
if (snapshot.apRemaining !== undefined) {
  apRemaining = snapshot.apRemaining;
  apMax = snapshot.apMax || 15;
  if (snapshot.apEnabled !== undefined) apEnabled = snapshot.apEnabled;
  log("[AP] \u6062\u590dAP\u4e3a" + apRemaining + "/" + apMax, "info");
  updateAPDisplay();
}
    tianJiangs = snapshot.tianJiangs;
    giants = snapshot.giants;
    stackedDancers = snapshot.stackedDancers;
    currentPlayer = snapshot.currentPlayer;
    deadPoolBlack = snapshot.deadPoolBlack;
    deadPoolRed = snapshot.deadPoolRed;
    selectedPiece = null;
    validMoves = [];
    dangerMoves = [];
    countPieces();
    drawBoard();
    log('↩️ 悔棋成功', 'info');
  }

function startAuto() { if(autoRunning) return; autoRunning=true; document.getElementById('autoPlayBtn').disabled=true; document.getElementById('pauseBtn').disabled=false; autoTimer=setInterval(autoStep,600); }

function stopAuto() { autoRunning=false; clearInterval(autoTimer); document.getElementById('autoPlayBtn').disabled=false; document.getElementById('pauseBtn').disabled=true; statusBar.textContent='🔹 已暂停'; }

function resetAndCenter() { stopAuto(); initPieces(); currentPlayer=RED; drawBoard(); countPieces(); selectedPiece=null; validMoves=[]; const cx=getX(1)-boardContainer.clientWidth/2, cy=getY(10)-boardContainer.clientHeight/2; boardContainer.scrollTo({left:cx, top:cy, behavior:'smooth'}); statusBar.textContent='🔹 已复位并居中'; log('🔄 棋盘已复位'); }

export { evaluateMove, selectBestMove, autoStep, startAuto, stopAuto,
  undoMove, resetAndCenter };
