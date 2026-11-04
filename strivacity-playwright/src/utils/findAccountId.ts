/**
 * Finds the account id for an identifier inside ANY list-response shape (array, {items}, {accounts}...).
 * Used because the exact list/filter contract is not relied upon.
 *
 * Rule: the deepest object that has a string `id` different from the identifier itself
 * AND contains the identifier somewhere inside it. (An account like
 * { id: 'abc', local: { id: 'jane' } } resolves to 'abc', not to the nested local.id 'jane'.)
 */
export function findAccountId(node: unknown, identifier: string): string | undefined {
  const wanted = identifier.toLowerCase();

  const contains = (n: unknown): boolean => {
    if (typeof n === 'string') return n.toLowerCase() === wanted;
    if (Array.isArray(n)) return n.some(contains);
    if (n && typeof n === 'object') return Object.values(n as object).some(contains);
    return false;
  };

  const visit = (n: unknown): string | undefined => {
    if (Array.isArray(n)) {
      for (const item of n) {
        const found = visit(item);
        if (found) return found;
      }
      return undefined;
    }
    if (n && typeof n === 'object') {
      const obj = n as Record<string, unknown>;
      for (const child of Object.values(obj)) {
        const found = visit(child);
        if (found) return found;
      }
      const id = obj.id ?? obj.accountId;
      if (typeof id === 'string' && id.toLowerCase() !== wanted && contains(obj)) return id;
    }
    return undefined;
  };

  return visit(node);
}
