export const levenshteinDistance = (a: string, b: string): number => {
  let previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const currentRow = [row];
    for (let column = 1; column <= b.length; column += 1) {
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
      currentRow.push(
        Math.min(previousRow[column] + 1, currentRow[column - 1] + 1, previousRow[column - 1] + substitutionCost),
      );
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
};
