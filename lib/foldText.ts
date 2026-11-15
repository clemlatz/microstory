/**
 * Text folding for search: lowercase and accent-insensitive, so "helena"
 * matches "Héléna" and "ECOLE" matches "école".
 */
function foldChar(char: string): string {
  return char
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
}

export function foldText(text: string): string {
  let folded = ''
  for (const char of text) folded += foldChar(char)
  return folded
}

/**
 * The `[start, end)` ranges of `text` (original indexes) where `query` occurs
 * once both are folded. Folding can change the length of a character (a
 * decomposed accent folds to nothing), so folded positions are mapped back
 * to original ones.
 */
export function findFoldedMatches(text: string, query: string): Array<[number, number]> {
  const needle = foldText(query)
  if (!needle) return []

  let folded = ''
  const origins: number[] = [] // folded index -> original index
  const ends: number[] = [] // folded index -> original index just after its character
  let index = 0
  for (const char of text) {
    const part = foldChar(char)
    for (let i = 0; i < part.length; i++) {
      origins.push(index)
      ends.push(index + char.length)
    }
    folded += part
    index += char.length
  }

  const matches: Array<[number, number]> = []
  for (let at = folded.indexOf(needle); at !== -1; at = folded.indexOf(needle, at + needle.length)) {
    let end = ends[at + needle.length - 1]
    // Keep combining marks that follow the last matched character in the highlight.
    while (end < text.length && foldChar(text[end]) === '') end++
    matches.push([origins[at], end])
  }
  return matches
}
