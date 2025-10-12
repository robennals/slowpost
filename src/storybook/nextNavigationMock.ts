type Router = {
  push: (href: string) => void;
  replace: (href: string) => void;
  prefetch: (href: string) => Promise<void>;
  back: () => void;
  forward: () => void;
  refresh: () => void;
};

const defaultRouter: Router = {
  push: () => undefined,
  replace: () => undefined,
  prefetch: async () => undefined,
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
};

let currentRouter: Router = { ...defaultRouter };
let currentParams: Record<string, string> = {};
let currentSearchParams: URLSearchParams = new URLSearchParams();

export function useRouter(): Router {
  return currentRouter;
}

export function useParams<T extends Record<string, string>>() {
  return currentParams as T;
}

export function usePathname(): string {
  return '/';
}

export function useSearchParams(): URLSearchParams {
  return currentSearchParams;
}

export function __setMockRouter(router: Partial<Router>) {
  currentRouter = { ...defaultRouter, ...router };
}

export function __setMockParams(params: Record<string, string>) {
  currentParams = { ...params };
}

export function __setMockSearchParams(params: Record<string, string>) {
  currentSearchParams = new URLSearchParams(params);
}

export function __resetMockNavigation() {
  currentRouter = { ...defaultRouter };
  currentParams = {};
  currentSearchParams = new URLSearchParams();
}
