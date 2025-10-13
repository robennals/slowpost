import { rm } from 'fs/promises';

async function globalTeardown() {
  const tmpDir = process.env.PLAYWRIGHT_TMP_DIR;
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export default globalTeardown;
