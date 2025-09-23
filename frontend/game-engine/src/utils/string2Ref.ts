export function String2Ref(c: string): any {
  const path = c.split(".");
  let cl = null;
  if (path.length > 0) {
    cl = (globalThis as any)[path[0]];
    for (let i = 1; i < path.length; i++) {
      cl = cl[path[i]];
    }
  }
  return cl;
}
