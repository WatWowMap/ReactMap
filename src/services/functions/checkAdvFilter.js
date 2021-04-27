/* eslint-disable no-plusplus */
/* eslint-disable no-cond-assign */
/* eslint-disable default-case */
export default function checkIVFilterValid(filter) {
  const input = filter.toUpperCase()
  const tokenizer = /\s*([()|&!,]|([ADSL]?|CP|[GU]L)\s*([0-9]+(?:\.[0-9]*)?)(?:\s*-\s*([0-9]+(?:\.[0-9]*)?))?)/g
  let expectClause = true
  let stack = 0
  let lastIndex = 0
  let match
  while ((match = tokenizer.exec(input)) !== null) {
    if (match.index > lastIndex) {
      return null
    }
    if (expectClause) {
      if (match[3] !== undefined) {
        expectClause = false
      } else {
        switch (match[1]) {
          case '(':
            if (++stack > 1000000000) {
              return null
            }
            break
          case '!':
            break
          default:
            return null
        }
      }
    } else if (match[3] !== undefined) {
      return null
    } else {
      switch (match[1]) {
        case '(':
        case '!':
          return null
        case ')':
          if (--stack < 0) {
            return null
          }
          break
        case '&':
        case '|':
        case ',':
          expectClause = true
          break
      }
    }
    lastIndex = tokenizer.lastIndex
  }
  if (expectClause || stack !== 0 || lastIndex < filter.length) {
    return null
  }
  return true
}
