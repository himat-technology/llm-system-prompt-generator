/**
 * Small, dependency-free XML helpers used to guarantee that generated XML prompts are
 * well-formed regardless of what the user typed.
 */

export const XML_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

export function isValidXmlName(name: string): boolean {
  return XML_NAME_PATTERN.test(name) && !/^xml/i.test(name);
}

export function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** True when the text can be placed directly inside an XML element without escaping. */
export function isXmlSafeText(text: string): boolean {
  return !/[<&]/.test(text) && !text.includes("]]>");
}

/**
 * Wraps text in a CDATA section. A literal `]]>` inside the text is split across two CDATA
 * sections so the result is always well-formed.
 */
export function toCdata(text: string): string {
  return `<![CDATA[${text.split("]]>").join("]]]]><![CDATA[>")}]]>`;
}

/**
 * Returns content that is safe to place inside an XML element. Plain prose is kept as-is for
 * readability; content containing markup-significant characters (`<`, `&`) is wrapped in CDATA
 * so code snippets and inline tags survive verbatim without producing malformed XML.
 */
export function toXmlContent(text: string): { content: string; cdata: boolean } {
  if (isXmlSafeText(text)) return { content: text, cdata: false };
  return { content: toCdata(text), cdata: true };
}

/**
 * Removes characters that are illegal in XML 1.0 documents: most C0 control characters,
 * U+FFFE/U+FFFF and unpaired UTF-16 surrogates.
 */
export function stripInvalidXmlChars(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

export interface XmlCheckResult {
  valid: boolean;
  error?: string;
}

const ENTITY_PATTERN = /^&(?:[A-Za-z][A-Za-z0-9]*|#[0-9]+|#x[0-9A-Fa-f]+);/;

/**
 * A strict, minimal well-formedness checker for the XML this app generates:
 * elements, attributes, comments, CDATA, processing instructions and entity references.
 * DTDs are not supported (and never generated).
 */
export function checkXmlWellFormed(xml: string): XmlCheckResult {
  const stack: string[] = [];
  let rootCount = 0;
  let i = 0;
  const n = xml.length;

  const textError = (chunk: string): string | null => {
    for (let j = 0; j < chunk.length; j += 1) {
      if (chunk[j] === "&" && !ENTITY_PATTERN.test(chunk.slice(j))) {
        return "Unescaped '&' in text content.";
      }
    }
    if (stack.length === 0 && chunk.trim().length > 0) {
      return "Text content found outside the root element.";
    }
    return null;
  };

  while (i < n) {
    const lt = xml.indexOf("<", i);
    const textChunk = lt === -1 ? xml.slice(i) : xml.slice(i, lt);
    const err = textError(textChunk);
    if (err) return { valid: false, error: err };
    if (lt === -1) break;
    i = lt;

    if (xml.startsWith("<?", i)) {
      const end = xml.indexOf("?>", i + 2);
      if (end === -1) return { valid: false, error: "Unterminated processing instruction." };
      i = end + 2;
      continue;
    }
    if (xml.startsWith("<!--", i)) {
      const end = xml.indexOf("-->", i + 4);
      if (end === -1) return { valid: false, error: "Unterminated comment." };
      i = end + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", i)) {
      if (stack.length === 0) return { valid: false, error: "CDATA section outside the root element." };
      const end = xml.indexOf("]]>", i + 9);
      if (end === -1) return { valid: false, error: "Unterminated CDATA section." };
      i = end + 3;
      continue;
    }
    if (xml.startsWith("<!", i)) {
      return { valid: false, error: "DOCTYPE and other declarations are not supported." };
    }

    const gt = xml.indexOf(">", i);
    if (gt === -1) return { valid: false, error: "Unterminated tag." };
    const tag = xml.slice(i + 1, gt);
    i = gt + 1;

    if (tag.startsWith("/")) {
      const name = tag.slice(1).trim();
      const open = stack.pop();
      if (open === undefined) return { valid: false, error: `Unexpected closing tag </${name}>.` };
      if (open !== name) {
        return { valid: false, error: `Mismatched closing tag </${name}>; expected </${open}>.` };
      }
      continue;
    }

    const selfClosing = tag.endsWith("/");
    const body = selfClosing ? tag.slice(0, -1) : tag;
    const nameMatch = /^([A-Za-z_][A-Za-z0-9_.:-]*)/.exec(body);
    if (!nameMatch) return { valid: false, error: `Invalid tag <${tag}>.` };
    const attrs = body.slice(nameMatch[1].length);
    if (attrs.trim().length > 0 && !/^(\s+[A-Za-z_][A-Za-z0-9_.:-]*\s*=\s*("[^"<]*"|'[^'<]*'))*\s*$/.test(attrs)) {
      return { valid: false, error: `Invalid attributes on <${nameMatch[1]}>.` };
    }
    if (stack.length === 0) {
      rootCount += 1;
      if (rootCount > 1) return { valid: false, error: "Multiple root elements." };
    }
    if (!selfClosing) stack.push(nameMatch[1]);
  }

  if (stack.length > 0) return { valid: false, error: `Unclosed tag <${stack[stack.length - 1]}>.` };
  if (rootCount === 0) return { valid: false, error: "No root element." };
  return { valid: true };
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
]);

/** Removes fenced code blocks and inline code spans, which commonly contain tag-like text. */
function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
}

/**
 * Lenient check for tag-like markup inside free-form user text (e.g. "wrap the answer in
 * <answer></answer>"). Returns the names of tags that are opened but never closed, or closed
 * without being opened. Code blocks, self-closing and HTML void tags are ignored, as are
 * generic type arguments such as `Promise<User>` (a `<` directly after an identifier).
 */
export function findUnbalancedTags(text: string): string[] {
  if (!text || !text.includes("<")) return [];
  const source = stripCode(text);
  const tagPattern = /<(\/?)([A-Za-z_][A-Za-z0-9_.-]*)((?:\s[^<>]*)?)>/g;
  const stack: string[] = [];
  const unbalanced = new Set<string>();

  for (const match of source.matchAll(tagPattern)) {
    const [, closing, name, rest] = match;
    if (rest.trimEnd().endsWith("/") || VOID_TAGS.has(name.toLowerCase())) continue;
    if (!closing && match.index > 0 && /[A-Za-z0-9_]/.test(source[match.index - 1])) continue;
    if (!closing) {
      stack.push(name);
      continue;
    }
    const idx = stack.lastIndexOf(name);
    if (idx === -1) {
      unbalanced.add(name);
    } else {
      for (const orphan of stack.splice(idx)) if (orphan !== name) unbalanced.add(orphan);
    }
  }
  for (const orphan of stack) unbalanced.add(orphan);
  return [...unbalanced];
}
