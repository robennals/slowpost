declare module 'next/navigation' {
  type MockRouter = {
    push: (href: string) => void;
    replace: (href: string) => void;
    prefetch: (href: string) => Promise<void>;
    back: () => void;
    forward: () => void;
    refresh: () => void;
  };

  export function useRouter(): MockRouter;
  export function useParams<T extends Record<string, string> = Record<string, string>>(): T;
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function __setMockRouter(router: Partial<MockRouter>): void;
  export function __setMockParams(params: Record<string, string>): void;
  export function __setMockSearchParams(params: Record<string, string>): void;
  export function __resetMockNavigation(): void;
}
