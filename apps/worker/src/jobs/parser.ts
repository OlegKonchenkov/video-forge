import { supabase } from '../lib/supabase';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function downloadFromStorage(fileName: string): Promise<string> {
  const { data, error } = await supabase.storage.from('uploads').download(fileName);
  if (error || !data) throw new Error('Failed to download file: ' + fileName);
  const tmpPath = path.join(os.tmpdir(), path.basename(fileName));
  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

export async function parsePdf(fileName: string): Promise<string> {
  const filePath = await downloadFromStorage(fileName);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const result = await pdfParse(buffer);
  return result.text.slice(0, 5000);
}

export async function parsePpt(fileName: string): Promise<string> {
  const filePath = await downloadFromStorage(fileName);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value.slice(0, 5000);
}
