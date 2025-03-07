/**
 * Reflow text into lines of a specified maximum length,
 * but preserve any original line break if that line
 * is within the maxLen. Only wrap lines that exceed maxLen.
 *
 * @param text    The input text to reflow.
 * @param maxLen  The maximum characters allowed per line.
 * @returns       An array of lines, preserving shorter lines as they are.
 */
export function reflowText(text: string, maxLen: number = 100): string[] {
  // Split on line breaks to respect existing lines
  const originalLines = text.split(/\r?\n/);

  const reflowedLines: string[] = [];

  for (const originalLine of originalLines) {
    // Preserve empty lines (e.g., blank line between paragraphs)
    if (originalLine === '') {
      reflowedLines.push('');
      continue;
    }

    // If the entire line fits within maxLen, keep it as-is.
    if (originalLine.length <= maxLen) {
      reflowedLines.push(originalLine);
      continue;
    }

    // Otherwise, we break this long line into multiple lines by spaces.
    // 1) Split into words
    const words = originalLine.split(/\s+/).filter(Boolean);
    let currentLine = '';

    for (const word of words) {
      // If we're starting a fresh line
      if (currentLine.length === 0) {
        // If the single word itself is bigger than maxLen,
        // we place it as its own line (cannot split within the word).
        if (word.length <= maxLen) {
          currentLine = word;
        } else {
          reflowedLines.push(word);
        }
      } else {
        // Check if adding this word would exceed maxLen
        if ((currentLine + ' ' + word).length > maxLen) {
          // Push the currentLine and start a new one
          reflowedLines.push(currentLine);
          // If the word itself is larger than maxLen, push it as-is
          if (word.length <= maxLen) {
            currentLine = word;
          } else {
            reflowedLines.push(word);
            currentLine = '';
          }
        } else {
          // Safe to append the word to the current line
          currentLine += ' ' + word;
        }
      }
    }

    // Push any leftover text if we have something in currentLine
    if (currentLine) {
      reflowedLines.push(currentLine);
    }
  }

  return reflowedLines;
}
