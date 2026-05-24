// ===== 主入口 =====
import { ROW_MIN, ROW_MAX, COL_MIN, COL_MAX, ROWS, COLS, LINE_SPAN, PADDING,
  RED, BLACK, RED_COLOR, BLACK_COLOR, REVIVABLE_TYPES, bridgeCells, bridgeSet,
  pieceValues, ruleMap, medicalBlack, medicalRed, MAX_HISTORY, isYuBridge,
  apEnabled, apMax, apRemaining, getAPCost,
  updateAPDisplay, getX, getY } from "./data.js";
import { board, tianJiangs, giants, stackedDancers, currentPlayer,
  selectedPiece, validMoves, dangerMoves, deadPoolBlack, deadPoolRed,
  historyStack, autoRunning, autoTimer, lastEatenPiece, isGiantAttackedThisTurn,
  countPieces, initPieces, checkGameEnd, announceWinner, checkWinner } from "./gameState.js";
import { isBridge, generateMoves, isCellAttacked, canPieceAttackCell,
  canTianJiangAttackCell, isTianJiangInCheck, getCheckType, wouldCauseGeneralFaceoff } from "./moveGen.js";
import { applyMove } from "./apply.js";
import { log, logPanel, statusBar } from "./log.js";
import { drawBoard } from "./ui.js";
import { evaluateMove, selectBestMove, autoStep, startAuto, stopAuto,
  undoMove, resetAndCenter } from "./ai.js";

// 全局导出（兼容外部调用）
window.board = board; window.tianJiangs = tianJiangs;
window.giants = giants; window.stackedDancers = stackedDancers;
window.currentPlayer = currentPlayer;
window.selectedPiece = selectedPiece;
window.drawBoard = drawBoard; window.log = log;
window.initPieces = initPieces;
window.startAuto = startAuto; window.stopAuto = stopAuto;
window.resetAndCenter = resetAndCenter; window.undoMove = undoMove;
window.countPieces = countPieces; window.applyMove = applyMove;
window.generateMoves = generateMoves; window.checkWinner = checkWinner;
window.updateAPDisplay = updateAPDisplay;
window.checkGameEnd = checkGameEnd;
window.announceWinner = announceWinner;

// 初始化
apRemaining = apMax;
initPieces();
drawBoard();
countPieces();
updateAPDisplay();

document.getElementById("autoPlayBtn").addEventListener("click", startAuto);
document.getElementById("pauseBtn").addEventListener("click", stopAuto);
document.getElementById("resetBtn").addEventListener("click", resetAndCenter);
document.getElementById("undoBtn").addEventListener("click", undoMove);
