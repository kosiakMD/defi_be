export type UpdateStrategy = 'fill' | 'override' | 'default';

export const objectUpdate = (
  targetObject: Record<string, any>,
  sourceObject: Record<string, any>,
  dictionary: Record<string, string> | string = 'fill',
  strategy: UpdateStrategy = 'fill',
): void => {
  const strategyOverride = (key: string, value: any, targetField: string): void =>
    (targetObject[targetField] = value);
  const strategyFill = (key: string, value: any, targetField: string): void =>
    value && (targetObject[targetField] = value);
  const strategyDefault = (key: string, value: any, targetField: string): void =>
    (targetObject[targetField] = value ? value : null);

  let source = dictionary;
  let applyStrategy: string = strategy;
  let withoutDictionary = false;
  if (!dictionary || typeof dictionary === 'string') {
    withoutDictionary = true;
    source = sourceObject;
    applyStrategy = dictionary as string;
  }

  Object.keys(source).forEach((key) => {
    const value = sourceObject[key]; // TODO
    const targetField = withoutDictionary ? key : dictionary[key];
    if (applyStrategy === 'fill') {
      strategyFill(key, value, targetField);
    } else if (applyStrategy === 'override') {
      strategyOverride(key, value, targetField);
    } else {
      strategyDefault(key, value, targetField);
    }
  });
};
