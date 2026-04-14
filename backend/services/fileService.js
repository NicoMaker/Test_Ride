import fs from "fs";

export function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function ensureFile(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    writeJSON(filePath, defaultData);
  }
}