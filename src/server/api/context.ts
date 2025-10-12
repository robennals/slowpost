import type { HandlerDeps } from './types';

let currentDeps: HandlerDeps | null = null;

export function setHandlerDeps(deps: HandlerDeps) {
  currentDeps = deps;
}

export function getHandlerDeps(): HandlerDeps {
  if (!currentDeps) {
    throw new Error('Handler dependencies have not been initialised');
  }
  return currentDeps;
}
