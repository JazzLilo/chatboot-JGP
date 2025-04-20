import directory from '../config/directory.js'
import path from 'path';
import { mkdir } from 'fs/promises';

export const createSessionDirectory = async (sender, solicitudId) => {
  const today = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = directory.getPath("assets")

  const sessionPath = path.join(
    base,
    today,
    sender,
    `session_${solicitudId}_${timestamp}`
  );

  console.log(`Creating session directory: ${sessionPath}`);

  await mkdir(sessionPath, { recursive: true });
  console.log(`Session directory created: ${sessionPath}`);
  return sessionPath;
};