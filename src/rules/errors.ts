/** Thrown when an action isn't legal for that Player right now. */
export class RuleError extends Error {
  override name = 'RuleError';
}
