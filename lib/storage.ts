import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { BriefFormData } from './types';

export interface UploadedPlanMeta {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface StoredSubmission {
  id: string;
  createdAt: string;
  form: BriefFormData;
  summary: string;
  plan?: UploadedPlanMeta | null;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'submissions.json');

async function readStore(): Promise<StoredSubmission[]> {
  try {
    const raw = await readFile(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeStore(records: StoredSubmission[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

export async function saveSubmission(form: BriefFormData, summary: string, plan?: UploadedPlanMeta | null) {
  const existing = await readStore();
  const record: StoredSubmission = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    form,
    summary,
    plan: plan ?? null,
  };
  existing.push(record);
  await writeStore(existing);
  return record;
}
