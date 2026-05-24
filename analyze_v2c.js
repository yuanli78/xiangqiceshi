const fs = require("fs");
let c = fs.readFileSync("index.html", "utf8");

// Get the click handler section  
let clickIdx = c.indexOf("canvas.addEventListener('click'");
let clickEnd = c.indexOf("canvas.addEventListener('mousemove'", clickIdx);
let clickHandler = c.substring(clickIdx, clickEnd);

// Find all giant match lines
let lines = clickHandler.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("m.toRow") && lines[i].includes("m.toCol")) {
    console.log("LINE " + i + ": " + lines[i].trim());
  }
}
console.log("\n--- Now show all match patterns with giant ---");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("giant") && lines[i].includes("toRow")) {
    console.log("LINE " + i + ": " + lines[i].trim());
  }
}
