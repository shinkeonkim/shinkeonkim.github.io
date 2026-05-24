export function getCollection(): Promise<unknown[]> {
  return Promise.resolve([]);
}

export function defineCollection<T>(opts: T): T {
  return opts;
}

export const z = new Proxy(
  {},
  {
    get(_target, _prop) {
      return () => z;
    },
  },
);
