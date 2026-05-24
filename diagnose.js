const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

console.log("=== Check what's in the file ===");

// Check giant click matching
let idx1 = c.indexOf("if (m.type === 'giant'");
if (idx1 >= 0) console.log("1. Found pattern 1 at", idx1, ":", c.substring(idx1, idx1 + 200));
else console.log("1. Pattern 1 NOT found");

let idx2 = c.indexOf("if(m.type==='giant'");
if (idx2 >= 0) console.log("2. Found pattern 2 at", idx2, ":", c.substring(idx2, idx2 + 200));
else console.log("2. Pattern 2 NOT found");

// Check knockback
let idx3 = c.indexOf("被弹飞");
if (idx3 >= 0) console.log("3. Knockback found at", idx3, ":", c.substring(idx3 - 100, idx3 + 20));
else {
  console.log("3. Knockback NOT found");
  // Check if the attackedGiant section exists
  let idxAtt = c.indexOf("attackedGiant.hp--");
  if (idxAtt >= 0) {
    console.log("   attackedGiant.hp-- found at", idxAtt);
    console.log("   Context:", c.substring(idxAtt - 50, idxAtt + 300));
  }
}

// Check how many occurrences of attackedGiant.hp--
let count = 0;
let pos = 0;
while ((pos = c.indexOf("attackedGiant.hp--", pos)) >= 0) {
  count++;
  pos += 1;
}
console.log("Found", count, "occurrences of attackedGiant.hp--");

// Check the apply_v3.js output - was a backup created?
console.log("\n=== Checking which index.html we have ===");
console.log("Size:", c.length);

// Check if 点击匹配 was actually applied from the bak2 version
// Check if pattern 1 has the correct replacement
if (idx1 >= 0) {
  if (c.substring(idx1, idx1 + 200).includes("logicRow >= m.toRow")) {
    console.log("✅ Pattern 1 is CORRECT (updated)");
  } else {
    console.log("❌ Pattern 1 is OLD (not updated)");
  }
}
if (idx2 >= 0) {
  if (c.substring(idx2, idx2 + 200).includes("logicRow>=m.toRow")) {
    console.log("✅ Pattern 2 is CORRECT (updated)");
  } else {
    console.log("❌ Pattern 2 is OLD (not updated)");
  }
}
