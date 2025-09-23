export function GetValue(
  source: Record<string, any>,
  key: string,
  defaultValue: any,
  altSource?: Record<string, any>
): any {
  if ((!source && !altSource) || typeof source === "number") {
    return defaultValue;
  } else if (source && source[key] !== undefined) {
    return source[key];
  } else if (altSource && altSource[key] !== undefined) {
    return altSource[key];
  } else if (key.indexOf(".") !== -1) {
    const keys = key.split(".");
    let parentA = source;
    let parentB = altSource;
    let valueA = defaultValue;
    let valueB = defaultValue;
    let valueAFound = true;
    let valueBFound = true;

    //  Use for loop here so we can break early
    for (let i = 0; i < keys.length; i++) {
      if (parentA && parentA[keys[i]] !== undefined) {
        //  Yes parentA has a key property, let's carry on down
        valueA = parentA[keys[i]];
        parentA = parentA[keys[i]];
      } else {
        valueAFound = false;
      }

      if (parentB && parentB[keys[i]] !== undefined) {
        //  Yes parentB has a key property, let's carry on down
        valueB = parentB[keys[i]];
        parentB = parentB[keys[i]];
      } else {
        valueBFound = false;
      }
    }

    if (valueAFound) {
      return valueA;
    } else if (valueBFound) {
      return valueB;
    } else {
      return defaultValue;
    }
  } else {
    return defaultValue;
  }
}
