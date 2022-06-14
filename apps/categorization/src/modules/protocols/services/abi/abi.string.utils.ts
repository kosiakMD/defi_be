export const contains = (str: string, substr: string): boolean => {
  return str?.toLowerCase().indexOf(substr.toLowerCase()) >= 0;
};

export const startsWith = (name: string, beginning: string): boolean => {
  return name.toLowerCase().startsWith(beginning.toLowerCase());
};

export const regex = (name: string, regex: RegExp): RegExpMatchArray => {
  return name.toLowerCase().match(regex);
};

export const equals = (nameOne: string, nameTwo: string): boolean => {
  return nameOne.toLowerCase() === nameTwo.toLowerCase();
};

export const REWARD_REGEX = /^(\w+)(per)((block|sec(ond)?))$/;
