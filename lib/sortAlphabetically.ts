/**
 * Returns a copy of `items` ordered alphabetically by `getLabel`, ignoring
 * case and accents ("école" sorts with the "e"s) and comparing digit runs
 * numerically ("Note 2" before "Note 10").
 */
export function sortAlphabetically<T>(items: T[], getLabel: (item: T) => string): T[] {
  return [...items].sort((a, b) =>
    getLabel(a).localeCompare(getLabel(b), undefined, { sensitivity: 'base', numeric: true }),
  )
}
