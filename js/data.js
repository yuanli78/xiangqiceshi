// ===== 数据和常量 =====
const ROW_MIN = -18, ROW_MAX = 32, COL_MIN = -36, COL_MAX = 38;
  const ROWS = ROW_MAX - ROW_MIN + 1, COLS = COL_MAX - COL_MIN + 1;
  const LINE_SPAN = 38, PADDING = 50;const RED = 'red', BLACK = 'black';
  const RED_COLOR = '#b91c1c', BLACK_COLOR = '#3a2a1a';
  const RIVER_ROW_START = 8, RIVER_ROW_END = 9;
  const BLACK_SHORE = 7, RED_SHORE = 10;

  function getX(c) { return PADDING + (c - COL_MIN) * LINE_SPAN; }
  function getY(r) { return PADDING + (r - ROW_MIN) * LINE_SPAN; }

  let board = [];
  let tianJiangs = [];
  let giants = [];
  let stackedDancers = [];
  let currentPlayer = RED;
  let autoRunning = false, autoTimer = null;
  let deadPoolBlack = [], deadPoolRed = [];
  const REVIVABLE_TYPES = ['车','马','炮','驼','骡','麒','飞车','战车','飞马','战马','飞炮','战炮','抛石器','悬','翔','追','截','轰','虎'];
  const medicalBlack = [{row:1,col:-18},{row:1,col:-16},{row:1,col:-14}];
  const medicalRed = [{row:13,col:16},{row:13,col:18},{row:13,col:20}];

  let selectedPiece = null;
  // ===== 九桥系统（汉制五门三道） =====
  const bridgeCells = [
    // 旁桥（8座，每座4行）
    {row:7,col:-21},{row:8,col:-21},{row:9,col:-21},{row:10,col:-21}, // 皋门
    {row:7,col:-15},{row:8,col:-15},{row:9,col:-15},{row:10,col:-15}, // 库门
    {row:7,col:-9},{row:8,col:-9},{row:9,col:-9},{row:10,col:-9},     // 雉门
    {row:7,col:-3},{row:8,col:-3},{row:9,col:-3},{row:10,col:-3},     // 应门
    {row:7,col:6},{row:8,col:6},{row:9,col:6},{row:10,col:6},         // 路门
    {row:7,col:12},{row:8,col:12},{row:9,col:12},{row:10,col:12},     // 左掖门
    {row:7,col:18},{row:8,col:18},{row:9,col:18},{row:10,col:18},     // 右掖门
    {row:7,col:24},{row:8,col:24},{row:9,col:24},{row:10,col:24},     // 公车门
    // 御桥（2列×4行，椭圆天将专行）
    {row:7,col:0},{row:8,col:0},{row:9,col:0},{row:10,col:0},
    {row:7,col:1},{row:8,col:1},{row:9,col:1},{row:10,col:1}
  ];
nction getAPCost(pieceName) {
if (!pieceName) return 0;
const t = pieceName;
// 测试棋子免费
const testP = ["\u6d4b","\u8bd5","\u6d4b\u8bd5","test","demo","\u5ef6\u7ec3"];
if (testP.includes(t)) return 0;
// 兵类 1点
const cost1 = ["\u5175","\u4e01","\u52c7","\u6b65","\u6b65\u5175","\u70c8","\u7f8e","\u5047","\u4fc3"];
if (cost1.includes(t)) return 1;
// 士类 2点
const costS = ["\u58eb","\u98de\u58eb","\u6218\u58eb","\u58eb\u5352"];
if (costS.includes(t)) return 2;
// 2点通用
const cost2 = ["\u8c61","\u9a6c","\u70ae","\u9a7c","\u9e7f","\u8749","\u5983","\u72d0","\u9b3c","\u86c7","\u60ac","\u7fd4","\u98de\u9a6c","\u6218\u9a6c","\u98de\u70ae","\u6218\u70ae"];
if (cost2.includes(t)) return 2;
// 3点通用
const cost3 = ["\u8f66","\u540e","\u864e","\u57ce","\u519b\u5e08","\u5fa1","\u5929\u5175","\u98de\u8f66","\u6218\u8f66","\u629b\u77f3\u5668","\u9e92","\u9a97","\u622a","\u8f70","\u6df1","\u591c","\u5fcd","\u541b","\u5b50","\u767d","\u6c34","\u706b","\u571f","\u7ff9","\u5d87"];
if (cost3.includes(t)) return 3;
// 飞将/战将 3点
if (t.startsWith("\u98de\u5c06") || t.startsWith("\u6218\u5c06")) return 3;
// 影类 3点
if (t.indexOf("\u5f71") === 0) return 3;
// 巨将 5点
if (t === "\u5de8\u5c06") return 5;
// 天将 6点
if (t.indexOf("\u5929\u5c06") === 0) return 6;
// 默认2点
return 2;


nction updateAPDisplay() {
if (!el) return;
if (!apEnabled) {
  el.textContent = "AP: \u5173\u95ed";
  el.style.background = "#eee";
  el.style.color = "#999";
  el.style.border = "1px solid #ccc";
  return;
}
el.textContent = "\ud83d\udfe2 AP: " + apRemaining + "/" + apMax;
if (apRemaining <= 3) {
  el.style.background = "#ffebee";
  el.style.color = "#c62828";
  el.style.border = "1px solid #ef5350";
} else if (apRemaining <= 7) {
  el.style.background = "#fff8e1";
  el.style.color = "#f57f17";
  el.style.border = "1px solid #ffa726";
} else {
  el.style.background = "#e8f5e9";
  el.style.color = "#2e7d32";
  el.style.border = "1px solid #4caf50";
}


  function isBridge(row, col) {
    return bridgeCells.some(b => b.row === row && b.col === col);
  }
  function isYuBridge(col) {
    return col === 0 || col === 1;
  }
  let validMoves = [];
  let dangerMoves = [];   // 存储移动后会被吃的目标格子
  let historyStack = [];          // 历史记录栈
  const MAX_HISTORY = 50;        // 最多悔棋步数
  
  const pieceValues = {
    '天将真': 1000, '天将卫': 800, '巨将': 600, '飞将': 400, '战将': 450,
    '士': 200, '飞士': 250, '战士': 220, '士卒': 180,
    '象': 250, '飞象': 300, '战象': 280, '国象': 200,
    '马': 220, '飞马': 260, '战马': 240, '骡': 230, '麒': 280, '异型马': 270,
    '车': 280, '飞车': 320, '战车': 310, '异型车': 300,
    '炮': 260, '飞炮': 300, '战炮': 290, '抛石器': 270, '异型炮': 280,
    '兵': 100, '重兵': 120, '丁': 110, '勇': 110, '步': 130, '步兵': 140, '斥': 150, '烈': 150,
    '雷': 120, '军师': 300, '御': 280, '鹿': 260, '蝉': 250, '后': 350,
    '驼': 250, '悬': 260, '翔': 270, '天兵': 400, '巫': 300,
    '诏': 250, '政': 280, '官': 230, '追': 240, '截': 220, '交': 200, '涉': 200, '日': 150, '月': 150, '卫': 180,
    '城': 350, '轰': 320, '舞': 300, '虎': 280, '妃': 250,
    '美': 200, '借': 200, '调': 200, '牵': 250, '混': 250, '擒': 300, '笑': 280, '假': 220, '隔': 250, '趁': 250, '欲': 250, '声': 280,
    '无': 250, '瞒': 250, '暗': 280, '关': 250, '指': 250, '上': 250, '树': 280, '空': 300, '苦': 250, '连': 300, '走': 280, '壳': 300,
    '围': 250, '人': 280, '以': 250, '李': 250, '打': 280, '砖': 250, '柱': 280, '远': 280, '主': 250, '虢': 280, '釜': 300, '畈': 250,
    '狐': 200, '鬼': 220, '蛇': 240, '画': 260, '促': 200,
    '影将': 100, '影士': 100, '影象': 100, '影马': 100, '影车': 100, '影炮': 100, '影兵': 100,
    '异型将': 0
  };
 ===== AP行动点系统 =====
t apEnabled = true;
t apMax = 15;
t apRemaining = 15;
t lastAPCost = 0;


  const ruleMap = {
    '天将真': '走:横竖一格；被将时特异\n吃:横竖一格吃',
    '天将卫': '走:未现身横竖一格；现身后横竖任意格\n吃:同天将真',
    '巨将': '走:横竖每次两格(整体2×2)\n吃:可同时吃1-3枚覆盖敌子',
    '飞将': '走:横竖斜一格\n吃:同走法',
    '战将': '走:横竖斜一格；可远距吃子\n吃:一格吃或远距直线/斜线吃',
    '异型将': '未入场',
    '士': '走:斜一格\n吃:斜一格',
    '飞士': '走:斜任意格\n吃:斜任意格',
    '战士': '走:横竖一格\n吃:同走法',
    '士卒': '走:斜一格(仅前向)\n吃:同走法',
    '影将': '走:横竖一格\n光环:将类可斜走',
    '影士': '走:斜一格\n光环:士类可横竖',
    '象': '走:田字+用字\n吃:同走法',
    '飞象': '走:大小田\n吃:同走法',
    '战象': '走:大小田\n吃:吃子受堵眼',
    '国象': '走:斜任意格(不可过河)\n吃:同走法',
    '影象': '走:横竖一格\n光环:象类无视堵眼',
    '马': '走:日字(蹩腿)\n吃:同走法',
    '飞马': '走:日字(无蹩腿)\n吃:同走法',
    '战马': '走:日字或目字\n吃:同走法',
    '骡': '走:目字(蹩腿)\n吃:同走法',
    '异型马': '走:日字(蹩腿)',
    '影马': '走:横竖一格\n光环:马类无视蹩腿',
    '车': '走:横竖任意格\n吃:同走法',
    '飞车': '走:横竖任意格，可越己子\n吃:横竖吃子',
    '战车': '走:横竖任意格+斜一格\n吃:同走法',
    '异型车': '走:横竖任意格',
    '影车': '走:横竖一格\n光环:车类可越子行走',
    '炮': '走:横竖任意格\n吃:隔一子直线吃子',
    '飞炮': '走:横竖任意格+斜一至两格\n吃:直线隔子/斜线隔己子打吃',
    '战炮': '走:横竖任意格\n吃:隔子吃，炮架为敌时可双杀',
    '抛石器': '走:横竖任意格\n吃:斜线隔己子紧邻打吃',
    '异型炮': '走:横竖任意格\n吃:隔子直线吃子',
    '影炮': '走:横竖一格\n光环:炮类可斜向隔子打吃',
    '兵': '走:前进一格/过河可横移\n吃:同走法',
    '重兵': '走:前进一格+隔子跳\n吃:同走法',
    '丁': '走:可横移+过河斜前\n吃:同走法',
    '勇': '走:可横移+过河斜前\n吃:同走法',
    '步': '走:斜前一格\n吃:同走法',
    '步兵': '走:前进一至两格\n吃:同兵',
    '斥': '走:斜两格(不可过河)\n吃:同走法',
    '影兵': '走:横竖一格\n光环:兵卒类不受河界限制',
    '烈': '走:横竖一格\n技能:可在医疗处献祭复活己方主力',
    '雷': '走:横竖任意格(不可过河)\n吃:不能吃子',
    '军师': '走:同炮吃法走法(不可过河)\n吃:不能吃子',
    '御': '走:横竖斜任意格(不可过河)\n吃:仅可左右或后方一格吃子',
    '鹿': '走:目字(无蹩腿)\n吃:同走法；双鹿紧邻须联动',
    '蝉': '走:横竖任意格(仅空走)\n吃:斜一格吃子',
    '后': '走:横竖斜任意格\n吃:同走法',
    '驼': '走:斜两格(无蹩腿)\n吃:同走法',
    '悬': '走:用字对角\n吃:同走法',
    '翔': '走:隔子飞行\n吃:同车吃子',
    '天兵': '走:横竖斜一格\n吃:叠压后按被压棋子规则吃子',
    '巫': '走:模仿对方上一手棋的走法\n吃:同模仿走法',
    '诏': '走:同车(不可过河)\n技能:召回己方过河棋子',
    '政': '走:隔子跳行(可连跳)\n吃:不能吃子',
    '官': '走:斜一至两格\n限制:对方将离宫才可入场',
    '追': '走:半场内同车\n吃:仅正面吃子',
    '截': '走:同追\n吃:不能吃子',
    '交': '走:横移或后退一格\n效果:存在时封锁河界',
    '涉': '走:横移或后退一格\n效果:存在时封锁河界',
    '日': '走:河岸横移+进退一格\n吃:不能吃子',
    '月': '走:河岸横移+进退一格\n吃:不能吃子',
    '卫': '走:河岸横移一格\n吃:不能吃子',
    '城': '走:横竖斜一格\n吃:不能吃子；不能被吃(仅兑)',
    '轰': '走:同炮\n吃:隔两子炸吃/条件轰炸/向前一步吃',
    '舞': '走:横竖斜一格/隔子跳\n吃:不能吃子(跳将帅胜)',
    '虎': '走:同炮\n吃:隔子吃；吃虎可复活己方一马',
    '妃': '走:日字(无蹩腿)\n吃:同走法；将帅在底线时激活',
    '美': '走:横竖一格\n过河后敌将只能左右移',
    '借': '走:横竖任意格\n己方车马炮兵可飞吃借',
    '调': '走:横竖任意格\n牺牲自己与敌子调位',
    '牵': '走:斜走(本界不限)\n牵制相邻敌子',
    '混': '走:同牵\n混扰敌子使其不能吃子',
    '擒': '走:同车\n只能吃将帅',
    '笑': '走:斜一格\n吃一子灭该兵种全部',
    '假': '走:横竖一格\n只能吃己子并备用',
    '隔': '走:同车(不可过河)\n纵向飞杀',
    '趁': '走:同炮(不可过河)\n纵向隔子飞杀',
    '欲': '走:同炮\n走棋后不能与敌子紧邻',
    '声': '走:同车\n隔一子反跳吃逆方向敌子',
    '无': '走:横竖斜一格\n空十字部署己方棋子',
    '瞒': '走:斜一至两格(不可越子)\n吃:同走法',
    '暗': '走:同炮\n吃:折线打吃(直角转弯炮)',
    '关': '走:横竖一格(不可过河)\n吃:仅身后吃；存在时敌过河不能退回',
    '指': '走:同车\n限制:只能选吃(恰好两敌子可吃时)',
    '上': '走:横竖一格(不可过河)\n吃:仅身后吃；存在时敌入不能离开',
    '树': '走:类似车\n纵必须跨河界，横必须跨中线',
    '空': '走:同炮\n士象全无且仅剩将时可全灭界内敌子',
    '苦': '走:同车\n被将时可吃己子解将',
    '连': '走:横竖斜一格/隔子跳\n跳回原位吃所跳全部敌子',
    '走': '走:横竖斜一格\n士象不全时可载将出宫',
    '壳': '走:横竖士线一格/隔子跳\n存在时将帅可走士线/跳跃',
    '围': '走:横竖一格\n走位使敌子无空位则围吃',
    '人': '走:同车\n吃什么棋按什么棋规则走吃',
    '以': '走:横竖一格\n借敌过河车马炮升级',
    '李': '走:日字(无蹩腿)\n保护同“日”对角己方马',
    '打': '走:同车\n等边直角折吃',
    '砖': '走:同炮\n送吃时对方必须吃',
    '柱': '走:同炮\n可联动车马炮同步移动',
    '远': '走:同车\n吃子需跨规则选同兵种另一枚',
    '主': '走:横竖任意格\n被吃后可操控敌一子走一步',
    '虢': '走:同炮\n吃子时连炮架一同吃掉',
    '釜': '走:横竖任意格\n可冻结区域敌子',
    '畈': '走:横竖一格\n过河后敌子不能过河/前进',
    '狐': '走:斜一格(不可过河)\n迷惑敌子使其只能斜走',
    '鬼': '走:横竖一格/隔子跳\n过河后敌兵马不能前进',
    '蛇': '走:斜一至两格\n士象无敌，吃蛇可灭士象',
    '画': '走:不能主动移动\n敌方吃子时可点将',
    '促': '走:兵被吃时激活，走法同过河兵'
  };


nction getAPCost(pieceName) {
if (!pieceName) return 0;
const t = pieceName;
// 测试棋子免费
const testP = ["\u6d4b","\u8bd5","\u6d4b\u8bd5","test","demo","\u5ef6\u7ec3"];
if (testP.includes(t)) return 0;
// 兵类 1点
const cost1 = ["\u5175","\u4e01","\u52c7","\u6b65","\u6b65\u5175","\u70c8","\u7f8e","\u5047","\u4fc3"];
if (cost1.includes(t)) return 1;
// 士类 2点
const costS = ["\u58eb","\u98de\u58eb","\u6218\u58eb","\u58eb\u5352"];
if (costS.includes(t)) return 2;
// 2点通用
const cost2 = ["\u8c61","\u9a6c","\u70ae","\u9a7c","\u9e7f","\u8749","\u5983","\u72d0","\u9b3c","\u86c7","\u60ac","\u7fd4","\u98de\u9a6c","\u6218\u9a6c","\u98de\u70ae","\u6218\u70ae"];
if (cost2.includes(t)) return 2;
// 3点通用
const cost3 = ["\u8f66","\u540e","\u864e","\u57ce","\u519b\u5e08","\u5fa1","\u5929\u5175","\u98de\u8f66","\u6218\u8f66","\u629b\u77f3\u5668","\u9e92","\u9a97","\u622a","\u8f70","\u6df1","\u591c","\u5fcd","\u541b","\u5b50","\u767d","\u6c34","\u706b","\u571f","\u7ff9","\u5d87"];
if (cost3.includes(t)) return 3;
// 飞将/战将 3点
if (t.startsWith("\u98de\u5c06") || t.startsWith("\u6218\u5c06")) return 3;
// 影类 3点
if (t.indexOf("\u5f71") === 0) return 3;
// 巨将 5点
if (t === "\u5de8\u5c06") return 5;
// 天将 6点
if (t.indexOf("\u5929\u5c06") === 0) return 6;
// 默认2点
return 2;


nction updateAPDisplay() {
const el = document.getElementById("apDisplay");
if (!el) return;
if (!apEnabled) {
  el.textContent = "AP: \u5173\u95ed";
  el.style.background = "#eee";
  el.style.color = "#999";
  el.style.border = "1px solid #ccc";
  return;
}
el.textContent = "\ud83d\udfe2 AP: " + apRemaining + "/" + apMax;
if (apRemaining <= 3) {
  el.style.background = "#ffebee";
  el.style.color = "#c62828";
  el.style.border = "1px solid #ef5350";
} else if (apRemaining <= 7) {
  el.style.background = "#fff8e1";
  el.style.color = "#f57f17";
  el.style.border = "1px solid #ffa726";
} else {
  el.style.background = "#e8f5e9";
  el.style.color = "#2e7d32";
  el.style.border = "1px solid #4caf50";
}


export { ROW_MIN, ROW_MAX, COL_MIN, COL_MAX, ROWS, COLS, LINE_SPAN, PADDING,
  RED, BLACK, RED_COLOR, BLACK_COLOR, RIVER_ROW_START, RIVER_ROW_END,
  BLACK_SHORE, RED_SHORE, REVIVABLE_TYPES, medicalBlack, medicalRed,
  bridgeCells, bridgeSet, MAX_HISTORY, pieceValues, ruleMap,
  apEnabled, apMax, apRemaining, lastAPCost,
  getAPCost, updateAPDisplay, getX, getY, isYuBridge };

}}}}
