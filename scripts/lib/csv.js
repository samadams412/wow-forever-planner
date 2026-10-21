// Semicolon-delimited CSV read/write, matching the shape wow.export's own DB2
// CSV exporter produces: header row, `;`-separated, array columns packed as a
// comma list in one field ("9,-100,0,0"). A field holding `;`, `"` or a
// newline is double-quoted with `""` escapes (ItemSparse descriptions such as
// "Time is nothing; timing is everything."), so the reader is quote-aware.

const fs = require("fs");

function parseRows(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === ";") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function readCsv(filePath) {
  const [header, ...rows] = parseRows(fs.readFileSync(filePath, "utf8").replace(/^﻿/, "").trim());
  return rows.map((cells) => {
    if (cells.length !== header.length) throw new Error(`${filePath}: row ${cells[0]} has ${cells.length} fields, header has ${header.length}`);
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  });
}

const quote = (v) => (/[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(";")];
  for (const row of rows) lines.push(columns.map((c) => quote(row[c] === undefined ? "" : String(row[c]))).join(";"));
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
}

module.exports = { readCsv, writeCsv };
