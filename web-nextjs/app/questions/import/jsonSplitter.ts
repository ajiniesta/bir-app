/**
 * Trocea el contenido de un fichero de preguntas en sus objetos JSON de primer nivel.
 * Acepta objetos concatenados {...}{...}, dentro de un array [{...},{...}] o un único objeto.
 */
export function splitJsonObjects(content: string): string[] {
  const chunks: string[] = [];
  if (!content) {
    return chunks;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (c === "\\") {
        escaped = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
    } else if (c === "{") {
      if (depth === 0) {
        start = i;
      }
      depth++;
    } else if (c === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        chunks.push(content.substring(start, i + 1));
        start = -1;
      }
    }
  }

  return chunks;
}
