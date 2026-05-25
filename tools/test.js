const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function screenshotGame() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const screenshotDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);
  
  const filePath = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
  
  try {
    await page.goto(filePath, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000); // 给 canvas 渲染时间
    const screenshotPath = path.join(screenshotDir, 'current.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // 检查控制台是否有错误
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // 等待几秒收集错误
    await page.waitForTimeout(1000);
    
    await browser.close();
    
    console.log('✅ 截图成功:', screenshotPath);
    
    // 比较与上一次截图的差异
    const prevPath = path.join(screenshotDir, 'baseline.png');
    if (fs.existsSync(prevPath)) {
      // 如果有 baseline，用 pixelmatch 或 ImageMagick 比较
      // 简单做法：只输出文件大小
      const currSize = fs.statSync(screenshotPath).size;
      const prevSize = fs.statSync(prevPath).size;
      const diff = Math.abs(currSize - prevSize) / prevSize * 100;
      if (diff > 5) {
        console.log('⚠️ 视觉差异:', diff.toFixed(1) + '%');
        console.log('  baseline:', (prevSize / 1024).toFixed(1), 'KB');
        console.log('  current:', (currSize / 1024).toFixed(1), 'KB');
      } else {
        console.log('✅ 视觉差异:', diff.toFixed(1) + '% (可接受)');
      }
    } else {
      // 第一次运行，保存为baseline
      fs.copyFileSync(screenshotPath, prevPath);
      console.log('📸 已保存 baseline 截图');
    }
    
    if (consoleErrors.length > 0) {
      console.log('❌ 控制台错误:', consoleErrors.length);
      consoleErrors.slice(0, 5).forEach(e => console.log('  ', e));
      process.exit(1);
    }
    
  } catch (e) {
    console.error('❌ 截图失败:', e.message);
    await browser.close().catch(() => {});
    process.exit(1);
  }
}

screenshotGame();
