export const parseSiteswap = (input: string) =>
  [...input].map((char) => {
    const value = parseInt(char, 36);
    if (isNaN(value)) throw new Error(`Invalid siteswap character: '${char}'`);
    return value;
  });

export const numBalls = (values: number[]) => {
  if (values.length === 0) throw new Error("Empty siteswap");
  const sum = values.reduce((total, value) => total + value, 0);
  if (sum % values.length !== 0) throw new Error("Invalid siteswap: average is not an integer");
  return sum / values.length;
};

export const computeInitialState = (siteswap: number[]) => {
  const maxThrow = Math.max(...siteswap);
  if (maxThrow === 0) return [];
  const state = new Array(maxThrow).fill(false);
  const patternLength = siteswap.length;
  const periodsBack = Math.ceil(maxThrow / patternLength);

  for (let period = 1; period <= periodsBack; period++) {
    for (let beatIndex = 0; beatIndex < patternLength; beatIndex++) {
      const beat = beatIndex - period * patternLength;
      const throwVal = siteswap[beatIndex];
      const landingBeat = beat + throwVal;
      if (landingBeat >= 0 && landingBeat < maxThrow) {
        state[landingBeat] = true;
      }
    }
  }
  return state;
};
