export function toBinaryLabel(n: number, maxHeight: number, reversed: boolean): string {
  const binary = n.toString(2).padStart(maxHeight, "0");
  return reversed ? binary.split("").reverse().join("") : binary;
}
