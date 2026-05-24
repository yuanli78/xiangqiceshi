const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

console.log("=== Final Verification ===\n");

// 1. Comment fix
console.log("1. Comment '// 放置巨将标记到新位置':", c.includes("// 放置巨将标记到新位置") ? "✅" : "❌");

// 2. Indentation fix
console.log("2. Indentation 'if (attackedGiant)':", c.includes("            if (attackedGiant) {") ? "✅" : "❌");

// 3. Giant attack click handling
console.log("3. Piece attacks giant in click handler:", c.includes("// 检查普通棋子攻击巨将") ? "✅" : "❌");
console.log("   TianJiang attacks giant in click handler:", c.includes("// 检查天将攻击巨将") ? "✅" : "❌");

// 4. GenerateMoves try-catch
console.log("4. generateMoves try-catch:", c.includes("generateMoves异常") ? "✅" : "❌");

// 5. Brace balance
let scriptStart = c.indexOf("(function() {");
let scriptEnd = c.lastIndexOf("})();") + 5;
let sc = c.substring(scriptStart, scriptEnd);
let o = 0, cl = 0;
for (let ch of sc) {
  if (ch === '{') o++;
  if (ch === '}') cl++;
}
console.log("5. Brace balance:", o, cl, o === cl ? "✅" : "❌");

// 6. Check for duplicate else  
console.log("6. No duplicate else:", !c.includes("} else { else {") ? "✅" : "❌");

// 7. Check toEat.forEach closure
// Look for the giant eating code - should have 
// }); ← forEach close
// log(💥 巨将碾压...
let giantSection = c.substring(c.indexOf("} else if(move.type==='giant') {"),
                               c.indexOf("} else {", c.indexOf("} else if(move.type==='giant') {")));
let forEachClose = giantSection.lastIndexOf("});");
let afterClose = giantSection.substring(forEachClose);
console.log("7. After forEach '});':", afterClose.substring(0, 40).replace(/\n/g, '\\n'));

// 8. Check that isGiantCell exists in click handler in the RIGHT place
let clickIdx = c.indexOf("canvas.addEventListener('click'");
let clickEnd = c.indexOf("canvas.addEventListener('mousemove'", clickIdx);
let clickSection = c.substring(clickIdx, clickEnd);
console.log("8. Click handler has isGiantCell check:", clickSection.includes("检查普通棋子攻击巨将") ? "✅" : "❌");
console.log("   Click handler has TJ giant check:", clickSection.includes("检查天将攻击巨将") ? "✅" : "❌");

// 9. Check TJ giant section in applyMove
console.log("9. TJ applyMove giant detection:", c.includes("tjGiantTarget.hp -= 2") ? "✅" : "❌");

// 10. Verify no syntax errors (quick check: parse the JS)
// We can't eval the whole file since it's HTML, but we can extract the script
let scriptTagStart = c.indexOf("<script>");
let scriptTagEnd = c.indexOf("</script>", scriptTagStart);
let jsContent = c.substring(scriptTagStart + 8, scriptTagEnd);
try {
  new Function(jsContent);
  console.log("10. JavaScript syntax check: ✅ No syntax errors");
} catch (e) {
  console.log("10. JavaScript syntax check: ❌ " + e.message);
}

console.log("\n=== All checks done ===");
