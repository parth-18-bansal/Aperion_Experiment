export function CreateInstance<T>(
  classType: new (...args: unknown[]) => T,
  ...args: ConstructorParameters<typeof classType>
): T {
  return new classType(...args);
}
