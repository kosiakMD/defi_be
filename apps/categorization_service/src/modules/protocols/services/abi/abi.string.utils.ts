export const contains = (str: string, substr: string): boolean => {
  return str?.toLowerCase().indexOf(substr.toLowerCase()) >= 0;
};
