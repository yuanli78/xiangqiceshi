// ===== 游戏状态 =====
import { ROW_MIN, ROW_MAX, COL_MIN, COL_MAX, ROWS, COLS, LINE_SPAN, PADDING,
  RED, BLACK, RED_COLOR, BLACK_COLOR, RIVER_ROW_START, RIVER_ROW_END,
  BLACK_SHORE, RED_SHORE, REVIVABLE_TYPES, medicalBlack, medicalRed,
  bridgeCells, bridgeSet, MAX_HISTORY, pieceValues, ruleMap,
  apEnabled, apMax, apRemaining, lastAPCost, getAPCost, updateAPDisplay } from "./data.js";
import { log } from "./log.js";

let board = [];
let tianJiangs = [];
let giants = [];
let stackedDancers = [];
let currentPlayer = RED;
let autoRunning = false, autoTimer = null;
let deadPoolBlack = [], deadPoolRed = [];
let selectedPiece = null;
let validMoves = [];
let dangerMoves = [];   // 存储移动后会被吃的目标格子
let historyStack = [];          // 历史记录栈

  function countPieces() {
    let black = 0, red = 0;
    for(let r=0; r<ROWS; r++) for(let c=0; c<COLS; c++) {
      const p = board[r][c];
      if(p && p.name !== '巨将') {
        if(p.color === BLACK) black++;
        else red++;
      }
    }
    tianJiangs.forEach(t => { if(t.color === BLACK) black++; else red++; });
    giants.forEach(g => { if(g.color === BLACK) black++; else red++; });
    stackedDancers.forEach(d => { if(d.color === BLACK) black++; else red++; });
    blackCountEl.textContent = `⚫ 黑方: ${black}`;
    redCountEl.textContent = `🔴 红方: ${red}`;
    return { black, red };
  }

  function initPieces() {
apRemaining = apMax; updateAPDisplay();
    board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    tianJiangs = []; giants = []; stackedDancers = [];
    deadPoolBlack = []; deadPoolRed = [];

    function setCell(row, col, name, color) {
      if(row<ROW_MIN||row>ROW_MAX||col<COL_MIN||col>COL_MAX) return;
      const r = row-ROW_MIN, c = col-COL_MIN;
      if(board[r][c]) console.warn(`覆盖 (${row},${col})`);
      board[r][c] = {name, color};
    }

    giants.push({color: BLACK, topLeftRow: 6, topLeftCol: -5, hp: 4});
    giants.push({color: RED, topLeftRow: 10, topLeftCol: 7, hp: 4});

    // 黑方天将真 — 占据两个格子
    tianJiangs.push({ type:'真', color:BLACK, leftCol:4, rightCol:5, row:2, hp:2, isRevealed:false, isUpgraded:false, isHalved:false });
    // 黑方天将卫
    tianJiangs.push({ type:'卫', color:BLACK, leftCol:7, rightCol:8, row:2, hp:2, isRevealed:false, isUpgraded:false, isHalved:false });
    // 红方天将真
    tianJiangs.push({ type:'真', color:RED, leftCol:-3, rightCol:-2, row:15, hp:2, isRevealed:false, isUpgraded:false, isHalved:false });
    // 红方天将卫
    tianJiangs.push({ type:'卫', color:RED, leftCol:-6, rightCol:-5, row:15, hp:2, isRevealed:false, isUpgraded:false, isHalved:false });

    setCell(2,1,'飞将',BLACK); setCell(2,10,'战将',BLACK);
    setCell(0,-25,'异型将',BLACK);
    setCell(15,1,'飞将',RED); setCell(15,-8,'战将',RED);
    setCell(17,27,'异型将',RED);

    setCell(2,0,'士',BLACK); setCell(2,3,'士',BLACK);
    setCell(2,6,'士',BLACK); setCell(2,11,'士',BLACK);
    setCell(1,3,'飞士',BLACK); setCell(1,8,'战士',BLACK);
    setCell(4,-10,'士卒',BLACK); setCell(4,12,'士卒',BLACK);
    setCell(15,2,'士',RED); setCell(15,-1,'士',RED);
    setCell(15,-4,'士',RED); setCell(15,-9,'士',RED);
    setCell(16,1,'飞士',RED); setCell(16,-6,'战士',RED);
    setCell(13,12,'士卒',RED); setCell(13,-10,'士卒',RED);

    setCell(4,5,'影将',BLACK); setCell(4,-4,'影士',BLACK);
    setCell(13,-3,'影将',RED); setCell(13,6,'影士',RED);

    setCell(2,-2,'象',BLACK); setCell(2,9,'象',BLACK);
    setCell(1,-5,'飞象',BLACK); setCell(1,13,'飞象',BLACK);
    setCell(1,-7,'战象',BLACK); setCell(1,15,'战象',BLACK);
    setCell(3,-8,'国象',BLACK); setCell(3,10,'国象',BLACK);
    setCell(4,-7,'影象',BLACK);
    setCell(15,4,'象',RED); setCell(15,-7,'象',RED);
    setCell(16,7,'飞象',RED); setCell(16,-11,'飞象',RED);
    setCell(16,9,'战象',RED); setCell(16,-13,'战象',RED);
    setCell(14,10,'国象',RED); setCell(14,-8,'国象',RED);
    setCell(13,9,'影象',RED);

    setCell(2,-6,'马',BLACK); setCell(2,12,'马',BLACK);
    setCell(1,-6,'飞马',BLACK); setCell(1,12,'飞马',BLACK);
    setCell(1,-9,'战马',BLACK); setCell(1,14,'战马',BLACK);
    setCell(2,-4,'骡',BLACK); setCell(4,6,'影马',BLACK);
    setCell(0,-18,'异型马',BLACK);
    setCell(15,8,'马',RED); setCell(15,-10,'马',RED);
    setCell(16,8,'飞马',RED); setCell(16,-10,'飞马',RED);
    setCell(16,11,'战马',RED); setCell(16,-12,'战马',RED);
    setCell(15,6,'骡',RED); setCell(13,-4,'影马',RED);
    setCell(17,20,'异型马',RED);

    setCell(2,-5,'车',BLACK); setCell(2,13,'车',BLACK);
    setCell(1,-11,'飞车',BLACK); setCell(1,16,'飞车',BLACK);
    setCell(1,-10,'战车',BLACK); setCell(1,17,'战车',BLACK);
    setCell(0,-17,'异型车',BLACK);
    setCell(4,8,'影车',BLACK);
    setCell(15,7,'车',RED); setCell(15,-11,'车',RED);
    setCell(16,13,'飞车',RED); setCell(16,-14,'飞车',RED);
    setCell(16,12,'战车',RED); setCell(16,-15,'战车',RED);
    setCell(17,19,'异型车',RED);
    setCell(13,-6,'影车',RED);

    setCell(2,-7,'炮',BLACK); setCell(2,14,'炮',BLACK);
    stackedDancers.push({row:2, col:-7, color:BLACK});
    stackedDancers.push({row:2, col:14, color:BLACK});

    setCell(1,-12,'飞炮',BLACK); setCell(1,18,'飞炮',BLACK);
    setCell(1,-13,'战炮',BLACK); setCell(1,19,'战炮',BLACK);
    setCell(1,-14,'抛石器',BLACK); setCell(1,20,'抛石器',BLACK);
    setCell(0,-19,'异型炮',BLACK);
    setCell(4,-9,'影炮',BLACK);
    setCell(15,9,'炮',RED); setCell(15,-12,'炮',RED);
    stackedDancers.push({row:15, col:9, color:RED});
    stackedDancers.push({row:15, col:-12, color:RED});

    setCell(16,14,'飞炮',RED); setCell(16,-16,'飞炮',RED);
    setCell(16,15,'战炮',RED); setCell(16,-17,'战炮',RED);
    setCell(16,16,'抛石器',RED); setCell(16,-18,'抛石器',RED);
    setCell(17,21,'异型炮',RED);
    setCell(13,11,'影炮',RED);

    setCell(5,-3,'兵',BLACK); setCell(5,-1,'兵',BLACK);
    setCell(5,1,'兵',BLACK); setCell(5,3,'兵',BLACK);
    setCell(5,5,'兵',BLACK); setCell(5,7,'兵',BLACK);
    setCell(5,-2,'丁',BLACK); setCell(5,8,'丁',BLACK);
    setCell(5,-4,'步兵',BLACK); setCell(5,9,'步兵',BLACK);
    setCell(5,-6,'烈',BLACK);
    setCell(4,-2,'重兵',BLACK); setCell(4,0,'重兵',BLACK);
    setCell(4,2,'重兵',BLACK); setCell(4,4,'重兵',BLACK);
    setCell(4,9,'重兵',BLACK);
    setCell(4,3,'步',BLACK);
    setCell(3,-4,'斥',BLACK); setCell(3,11,'斥',BLACK);
    setCell(4,10,'影兵',BLACK);

    setCell(3,-3,'雷',BLACK); setCell(3,1,'雷',BLACK);
    setCell(3,4,'雷',BLACK); setCell(3,8,'雷',BLACK);
    setCell(2,2,'军师',BLACK); setCell(3,5,'御',BLACK);
    setCell(2,-8,'鹿',BLACK); setCell(2,15,'鹿',BLACK);
    setCell(3,7,'蝉',BLACK);
    setCell(1,-15,'后',BLACK); setCell(1,21,'后',BLACK);

    setCell(-10,-16,'驼',BLACK); setCell(-10,24,'驼',BLACK);
    setCell(3,-2,'驼',BLACK); setCell(3,9,'驼',BLACK);
    setCell(1,-17,'悬',BLACK); setCell(1,23,'悬',BLACK);
    setCell(1,-19,'翔',BLACK); setCell(1,25,'翔',BLACK);
    setCell(0,-21,'天兵',BLACK);
    setCell(3,0,'巫',BLACK);

    setCell(3,2,'诏',BLACK);
    setCell(1,-2,'政',BLACK); setCell(1,9,'政',BLACK);
    setCell(-11,-16,'官',BLACK); setCell(-11,24,'官',BLACK);
    setCell(-10,-20,'追',BLACK); setCell(-10,-19,'截',BLACK);

    setCell(BLACK_SHORE, 1, '交', BLACK);
    setCell(BLACK_SHORE, -3, '日', BLACK);
    setCell(BLACK_SHORE, 6, '月', BLACK);
    setCell(BLACK_SHORE, 0, '卫', BLACK);

    setCell(2,-9,'城',BLACK); setCell(2,16,'城',BLACK);
    setCell(2,-10,'轰',BLACK); setCell(2,17,'轰',BLACK);
    setCell(3,-1,'虎',BLACK);
    setCell(1,-4,'妃',BLACK); setCell(1,10,'妃',BLACK);

    // 第一批三十六计
    let col = -30;
    setCell(-10, col++, '美', BLACK); setCell(-10, col++, '借', BLACK); setCell(-10, col++, '调', BLACK); setCell(-10, col++, '牵', BLACK); setCell(-10, col++, '混', BLACK);
    col = -28; setCell(-9, col++, '擒', BLACK); setCell(-9, col++, '笑', BLACK); setCell(-9, col++, '假', BLACK); setCell(-9, col++, '隔', BLACK); setCell(-9, col++, '趁', BLACK);
    col = -28; setCell(-8, col++, '欲', BLACK); setCell(-8, col++, '声', BLACK);

    // 第二批三十六计
    col = -26; setCell(-8, col++, '无', BLACK); setCell(-8, col++, '瞒', BLACK); setCell(-8, col++, '暗', BLACK);
    col = -25; setCell(-7, col++, '关', BLACK); setCell(-7, col++, '指', BLACK); setCell(-7, col++, '上', BLACK); setCell(-7, col++, '树', BLACK); setCell(-7, col++, '空', BLACK);
    col = -25; setCell(-6, col++, '苦', BLACK); setCell(-6, col++, '连', BLACK); setCell(-6, col++, '走', BLACK); setCell(-6, col++, '壳', BLACK);

    // 第三批三十六计
    col = -21; setCell(-6, col++, '围', BLACK); setCell(-6, col++, '人', BLACK); setCell(-6, col++, '以', BLACK); setCell(-6, col++, '李', BLACK); setCell(-6, col++, '打', BLACK); setCell(-6, col++, '砖', BLACK);
    col = -25; setCell(-5, col++, '柱', BLACK); setCell(-5, col++, '远', BLACK); setCell(-5, col++, '主', BLACK); setCell(-5, col++, '虢', BLACK); setCell(-5, col++, '釜', BLACK); setCell(-5, col++, '畈', BLACK);

    // 聊斋系列
    for (let r = -6; r <= -2; r++) {
      const name = r === -6 ? '狐' : r === -5 ? '鬼' : r === -4 ? '蛇' : r === -3 ? '画' : '促';
      for (let c = -10; c <= -7; c++) setCell(r, c, name, BLACK);
    }

    // 红方镜像
    // 第一批
    col = 32; setCell(27, col--, '美', RED); setCell(27, col--, '借', RED); setCell(27, col--, '调', RED); setCell(27, col--, '牵', RED); setCell(27, col--, '混', RED);
    col = 30; setCell(26, col--, '擒', RED); setCell(26, col--, '笑', RED); setCell(26, col--, '假', RED); setCell(26, col--, '隔', RED); setCell(26, col--, '趁', RED);
    col = 30; setCell(25, col--, '欲', RED); setCell(25, col--, '声', RED);
    // 第二批
    col = 28; setCell(25, col--, '无', RED); setCell(25, col--, '瞒', RED); setCell(25, col--, '暗', RED);
    col = 27; setCell(24, col--, '关', RED); setCell(24, col--, '指', RED); setCell(24, col--, '上', RED); setCell(24, col--, '树', RED); setCell(24, col--, '空', RED);
    col = 27; setCell(23, col--, '苦', RED); setCell(23, col--, '连', RED); setCell(23, col--, '走', RED); setCell(23, col--, '壳', RED);
    // 第三批
    col = 23; setCell(23, col--, '围', RED); setCell(23, col--, '人', RED); setCell(23, col--, '以', RED); setCell(23, col--, '李', RED); setCell(23, col--, '打', RED); setCell(23, col--, '砖', RED);
    col = 27; setCell(22, col--, '柱', RED); setCell(22, col--, '远', RED); setCell(22, col--, '主', RED); setCell(22, col--, '虢', RED); setCell(22, col--, '釜', RED); setCell(22, col--, '畈', RED);
    // 聊斋
    for (let r = 23; r >= 19; r--) {
      const name = r === 23 ? '狐' : r === 22 ? '鬼' : r === 21 ? '蛇' : r === 20 ? '画' : '促';
      for (let c = 9; c <= 12; c++) setCell(r, c, name, RED);
    }

    // 红方其他棋子
    setCell(12,5,'兵',RED); setCell(12,3,'兵',RED); setCell(12,1,'兵',RED); setCell(12,-1,'兵',RED); setCell(12,-3,'兵',RED); setCell(12,-5,'兵',RED);
    setCell(12,4,'丁',RED); setCell(12,-6,'丁',RED); setCell(12,6,'步兵',RED); setCell(12,-7,'步兵',RED); setCell(12,8,'烈',RED);
    setCell(13,4,'重兵',RED); setCell(13,2,'重兵',RED); setCell(13,0,'重兵',RED); setCell(13,-2,'重兵',RED); setCell(13,-7,'重兵',RED);
    setCell(13,-1,'步',RED); setCell(14,6,'斥',RED); setCell(14,-9,'斥',RED); setCell(13,-8,'影兵',RED);
    setCell(14,5,'雷',RED); setCell(14,1,'雷',RED); setCell(14,-2,'雷',RED); setCell(14,-6,'雷',RED);
    setCell(15,0,'军师',RED); setCell(14,-3,'御',RED); setCell(15,10,'鹿',RED); setCell(15,-13,'鹿',RED); setCell(14,-5,'蝉',RED);
    setCell(16,17,'后',RED); setCell(16,-19,'后',RED);
    setCell(24,18,'驼',RED); setCell(24,-22,'驼',RED); setCell(14,4,'驼',RED); setCell(14,-7,'驼',RED);
    setCell(16,19,'悬',RED); setCell(16,-21,'悬',RED); setCell(16,21,'翔',RED); setCell(16,-23,'翔',RED);
    setCell(17,23,'天兵',RED); setCell(14,2,'巫',RED);
    setCell(14,0,'诏',RED); setCell(16,4,'政',RED); setCell(16,-7,'政',RED);
    setCell(25,18,'官',RED); setCell(25,-22,'官',RED); setCell(24,22,'追',RED); setCell(24,21,'截',RED);
    setCell(RED_SHORE, 1, '涉', RED); setCell(RED_SHORE, -3, '日', RED); setCell(RED_SHORE, 6, '月', RED); setCell(RED_SHORE, 0, '卫', RED);
    setCell(15,11,'城',RED); setCell(15,-14,'城',RED); setCell(15,12,'轰',RED); setCell(15,-15,'轰',RED);
    setCell(14,3,'虎',RED); setCell(16,6,'妃',RED); setCell(16,-8,'妃',RED);
          // ===== 测试棋子（正式版删除此段） =====
    setCell(0, 0, '测试', BLACK);   // 黑方测试棋，全盘移动/全盘吃
    setCell(17, 0, '测试', RED);    // 红方测试棋
    // ===== 测试棋子结束 =====
  }

  function announceWinner(winner, reason) {
    stopAuto();
    log(`🏆 ${winner===RED?'红方':'黑方'}获胜！(${reason})`, 'warn');
    statusBar.textContent = `🏆 ${winner===RED?'红方':'黑方'}获胜！(${reason})`;
    return true;
  }

  function checkWinner() {
    const { black, red } = countPieces();
    if(black === 0) return RED;
    if(red === 0) return BLACK;
    return null;
  }

export { board, tianJiangs, giants, stackedDancers, currentPlayer,
  autoRunning, autoTimer, deadPoolBlack, deadPoolRed,
  selectedPiece, validMoves, dangerMoves, historyStack,
  lastEatenPiece, isGiantAttackedThisTurn,
  countPieces, initPieces, checkGameEnd, announceWinner, checkWinner };
