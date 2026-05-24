// ===== 日志函数 =====
import { ROW_MIN, ROW_MAX, COL_MIN, COL_MAX, ROWS, COLS, LINE_SPAN, PADDING } from "./data.js";

// DOM 引用
  const statusBar = document.getElementById('statusBar');
  const logPanel = document.getElementById('logPanel');

  function log(msg, type='info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logPanel.appendChild(entry);
    logPanel.scrollTop = logPanel.scrollHeight;
  }

export { log, logPanel, statusBar };
