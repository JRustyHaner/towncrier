// Utility to write JSON to disk with timestamped filename
import fs from 'fs/promises';
import path from 'path';

export async function writeJsonWithTimestamp(data: any, prefix = 'output') {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const filename = `${prefix}-${timestamp}.json`;
  const outPath = path.resolve(process.cwd(), filename);
  await fs.writeFile(outPath, JSON.stringify(data, null, 2), 'utf-8');
  return outPath;
}
