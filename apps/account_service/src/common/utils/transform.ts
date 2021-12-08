export function splitToArrayAndLowerCase(value: string): string[] {
  if (!value) {
    return [];
  }
  return value.split(',').map((v) => {
    return v.toLowerCase();
  });
}
