import type * as StorybookTest from '@storybook/test';

export function withPatchedStorybookTest(actual: typeof StorybookTest) {
  const originalWithin = actual.within;

  const patchedWithin: typeof originalWithin = ((...args) => {
    const originalWithinAny = originalWithin as (...inner: unknown[]) => ReturnType<typeof originalWithin>;
    const queries = originalWithinAny(...args);

    return new Proxy(queries, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof prop === 'string' && typeof value === 'function' && prop.startsWith('findBy')) {
          const fallbackKey = `findAll${prop.slice('findBy'.length)}` as keyof typeof queries;
          const fallback = Reflect.get(target, fallbackKey, receiver);
          if (typeof fallback !== 'function') {
            return value;
          }

          return async (...findArgs: unknown[]) => {
            try {
              return await (value as (...args: unknown[]) => Promise<unknown>)(...findArgs);
            } catch (error) {
              if (error instanceof Error && error.message.includes('Found multiple elements')) {
                const matches = await (fallback as (...args: unknown[]) => Promise<unknown[]>)(...findArgs);
                if (matches.length > 0) {
                  return matches[0];
                }
              }
              throw error;
            }
          };
        }

        return value;
      },
    });
  }) as typeof originalWithin;

  (patchedWithin as unknown as { __patched?: boolean }).__patched = true;

  const patchedDefault = 'default' in actual && actual.default
    ? { ...actual.default, within: patchedWithin }
    : undefined;

  return {
    ...actual,
    within: patchedWithin,
    ...(patchedDefault ? { default: patchedDefault } : {}),
  };
}
