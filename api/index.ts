type VercelRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[]>;
  body?: any;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string | string[]): VercelResponse;
  json(payload: any): void;
};

import { createVercelDeps, handleVercelRequest } from '../packages/server/src/api/vercel.js';

const depsPromise = createVercelDeps();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const deps = await depsPromise;
  await handleVercelRequest(req, res, deps);
}
