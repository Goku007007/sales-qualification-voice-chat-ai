export const inMemoryStore = new Map<string, unknown>();

export async function executeWithIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (inMemoryStore.has(key)) {
    return inMemoryStore.get(key) as T;
  }

  // Simulated lock could go here...
  try {
    const result = await operation();
    inMemoryStore.set(key, result);
    return result;
  } finally {
    // Release simulated lock
  }
}
