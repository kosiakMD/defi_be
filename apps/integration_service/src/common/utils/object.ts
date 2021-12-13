export type UpdateStrategy = 'fill' | 'override' | 'default' | 'difference';

export const objectUpdate = (
  targetObject: Record<string, any>,
  sourceObject: Record<string, any>,
  dictionary: Record<string, string> | UpdateStrategy = 'fill',
  strategy: UpdateStrategy = 'fill',
): void => {
  const strategyOverride = (key: string, sourceValue: any, targetField: string): void =>
    (targetObject[targetField] = sourceValue);
  const strategyFill = (key: string, sourceValue: any, targetField: string): void =>
    sourceValue && (targetObject[targetField] = sourceValue);
  const strategyDefault = (key: string, sourceValue: any, targetField: string): void =>
    (targetObject[targetField] = sourceValue ? sourceValue : null);

  let source = dictionary;
  let applyStrategy: string = strategy;
  let withoutDictionary = false;
  if (!dictionary || typeof dictionary === 'string') {
    applyStrategy = dictionary as string;
    withoutDictionary = true;
    if (applyStrategy === 'difference') {
      source = targetObject;
    } else {
      source = sourceObject;
    }
  }

  Object.keys(source).forEach((key) => {
    const sourceValue = sourceObject[key]; // TODO
    const targetField = withoutDictionary ? key : dictionary[key];
    if (applyStrategy === 'fill') {
      strategyFill(key, sourceValue, targetField);
    } else if (applyStrategy === 'override') {
      strategyOverride(key, sourceValue, targetField);
    } else {
      strategyDefault(key, sourceValue, targetField);
    }
  });
};
