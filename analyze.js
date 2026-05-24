const fs = require("fs");
const c = fs.readFileSync("index.html", "utf8");

console.log("=== 1. REVIVABLE_TYPES ===");
let i = c.indexOf("REVIVABLE_TYPES");
console.log(c.substring(i, i + 120));

console.log("\n=== 2. Giants init ===");
i = c.indexOf("giants.push");
console.log(c.substring(i, i + 80));

console.log("\n=== 3. Giant movement generation ===");
i = c.indexOf("giants.filter");
let end = c.indexOf("});", i);
end = c.indexOf("});", end + 3);
console.log(c.substring(i, end + 3));

console.log("\n=== 4. applyMove giant type ===");
i = c.indexOf("move.type===");
console.log("Found at:", i, "text:", c.substring(i, i + 50));

console.log("\n=== 5. Cannon mount check in generateMoves ===");
// Search for cannon eating logic in generateMoves
let searchTerms = ["// 炮类隔子", "// 下面原有的所", "if(piece.name==="];
for (const t of searchTerms) {
  i = c.indexOf(t);
  if (i >= 0) console.log("Found:", t, "at", i, "text:", c.substring(i, i + 100));
}

console.log("\n=== 6. Attacked giant in applyMove ===");
i = c.indexOf("attackedGiant");
if (i >= 0) {
  let start = c.lastIndexOf("\n", i);
  let end = c.indexOf("\n", i + 300);
  console.log(c.substring(start, end));
}

console.log("\n=== 7. Giant selection in click handler ===");
i = c.indexOf("selectedPiece={type:");
let i2 = c.indexOf("giant", i);
console.log("Found selectedPiece:", c.substring(i, i + 300));

console.log("\n=== 8. DrawBoard giant section ===");
i = c.indexOf("血条背");
if (i >= 0) console.log(c.substring(i - 100, i + 200));
