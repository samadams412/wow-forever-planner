// Minimal semicolon-delimited CSV read/write, matching the shape wow.export's
// own DB2 CSV exporter produces (header row, `;`-separated, no quoting of
// embedded delimiters in the columns this project actually reads). Not a
// general CSV parser -- if a future column needs embedded `;` or newlines,
// this needs a real parser instead.

const fs = require("fs");

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const header = raw[0].split(";");
  return raw.slice(1).map((line) => {
    const cells = line.split(";");
    const row = {};
    header.forEach((h, i) => {
      row[h] = cells[i];
    });
    return row;
  });
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(";")];
  for (const row of rows) {
    lines.push(columns.map((c) => (row[c] === undefined ? "" : row[c])).join(";"));
  }
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
}

module.exports = { readCsv, writeCsv };
