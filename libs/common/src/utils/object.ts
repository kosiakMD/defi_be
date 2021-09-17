export const filterObjectKeys = (
  obj: Record<string, any>,
  filter: (arg: any) => boolean,
): Record<string, any> =>
  Object.fromEntries(
    Object.entries(obj).filter((x) => {
      return filter(x[0]);
    }),
  );
