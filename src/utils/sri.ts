import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { parse, serialize } from 'parse5';

interface Element {
  nodeName: string;
  tagName?: string;
  attrs: Array<{ name: string; value: string }>;
  childNodes?: Element[];
  parentNode?: Element;
}

/**
 * Generates a SHA-384 hash for Subresource Integrity (SRI) from file content
 * @param filePath - Path to the file to hash
 * @returns Base64-encoded SHA-384 hash with 'sha384-' prefix
 */
function generateSRIHash(filePath: string): string {
  try {
    const fileContent = fs.readFileSync(filePath);
    const hash = crypto
      .createHash('sha384')
      .update(fileContent)
      .digest('base64');
    return `sha384-${hash}`;
  } catch {
    throw new Error(`Failed to generate SRI hash for ${filePath}`);
  }
}

/**
 * Checks if a file exists and is readable
 * @param filePath - Path to check
 * @returns True if file exists and is readable
 */
function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets attribute value from an element
 * @param element - Element to get attribute from
 * @param name - Attribute name
 * @returns Attribute value or null if not found
 */
function getAttribute(element: Element, name: string): string | null {
  const attr = element.attrs?.find((attr) => attr.name === name);
  return attr ? attr.value : null;
}

/**
 * Sets or updates an attribute on an element
 * @param element - Element to set attribute on
 * @param name - Attribute name
 * @param value - Attribute value
 */
function setAttribute(element: Element, name: string, value: string): void {
  if (!element.attrs) {
    element.attrs = [];
  }

  const existingAttr = element.attrs.find((attr) => attr.name === name);
  if (existingAttr) {
    existingAttr.value = value;
  } else {
    element.attrs.push({ name, value });
  }
}

/**
 * Recursively finds all elements with a specific tag name
 * @param node - Root node to search from
 * @param tagName - Tag name to search for
 * @returns Array of matching elements
 */
function getElementsByTagName(node: Element, tagName: string): Element[] {
  const results: Element[] = [];

  function traverse(currentNode: Element) {
    if (currentNode.nodeName === tagName || currentNode.tagName === tagName) {
      results.push(currentNode);
    }

    if (currentNode.childNodes) {
      currentNode.childNodes.forEach((child) => traverse(child));
    }
  }

  traverse(node);
  return results;
}

/**
 * Extracts the canonical URL from an HTML document
 * @param document - Parsed HTML document
 * @returns Canonical URL or null if not found
 */
function getCanonicalUrl(document: Element): string | null {
  const linkTags = getElementsByTagName(document, 'link');

  for (const link of linkTags) {
    const rel = getAttribute(link, 'rel');
    if (rel === 'canonical') {
      return getAttribute(link, 'href');
    }
  }

  return null;
}

/**
 * Converts an absolute URL to a relative file path if it's on the same domain as the canonical URL
 * @param url - The URL to convert (from script src or link href)
 * @param canonicalUrl - The canonical URL of the page
 * @param baseDir - Base directory of the HTML file
 * @returns Resolved file path if same domain, null otherwise
 */
function resolveUrlToPath(
  url: string,
  canonicalUrl: string | null,
  baseDir: string
): string | null {
  // If it's a relative path, resolve it directly
  if (
    !url.startsWith('http://') &&
    !url.startsWith('https://') &&
    !url.startsWith('//')
  ) {
    const resolvedPath = path.resolve(baseDir, url);
    return fileExists(resolvedPath) ? resolvedPath : null;
  }

  // If no canonical URL, we can't determine same-domain
  if (!canonicalUrl) {
    return null;
  }

  try {
    const resourceUrl = new URL(url, canonicalUrl);
    const canonical = new URL(canonicalUrl);

    // Check if same domain
    if (resourceUrl.origin !== canonical.origin) {
      return null;
    }

    // Get the directory path of the canonical URL
    const canonicalPath =
      canonical.pathname.endsWith('/') ?
        canonical.pathname
      : canonical.pathname.substring(
          0,
          canonical.pathname.lastIndexOf('/') + 1
        );

    // First, try resolving as if the resource is under the canonical path
    if (resourceUrl.pathname.startsWith(canonicalPath)) {
      const relativePath = resourceUrl.pathname.substring(canonicalPath.length);
      const resolvedPath = path.resolve(baseDir, relativePath);
      if (fileExists(resolvedPath)) {
        return resolvedPath;
      }
    }

    // If that didn't work, find the common base path and resolve from project root
    // Split paths into segments
    const canonicalSegments = canonicalPath.split('/').filter(Boolean);
    const resourceSegments = resourceUrl.pathname.split('/').filter(Boolean);

    // Find the common prefix length
    let commonLength = 0;
    while (
      commonLength < canonicalSegments.length &&
      commonLength < resourceSegments.length &&
      canonicalSegments[commonLength] === resourceSegments[commonLength]
    ) {
      commonLength++;
    }

    if (commonLength === 0) {
      // No common path, can't resolve
      return null;
    }

    // Calculate how many levels up we need to go from the canonical path
    const levelsUp = canonicalSegments.length - commonLength;

    // Build the relative path from the canonical location to the resource
    const upPath = '../'.repeat(levelsUp);
    const remainingSegments = resourceSegments.slice(commonLength);
    const relativePath = upPath + remainingSegments.join('/');

    // Resolve from baseDir
    const resolvedPath = path.resolve(baseDir, relativePath);

    return fileExists(resolvedPath) ? resolvedPath : null;
  } catch {
    return null;
  }
}

/**
 * Processes script tags and adds SRI attributes
 * @param scriptTag - Script element
 * @param baseDir - Base directory for resolving relative paths
 * @param canonicalUrl - Canonical URL of the page for resolving absolute URLs
 * @returns True if SRI was added successfully
 */
function processScriptTag(
  scriptTag: Element,
  baseDir: string,
  canonicalUrl: string | null
): boolean {
  const src = getAttribute(scriptTag, 'src');

  if (!src) return false;

  // Try to resolve the URL to a local file path
  const scriptPath = resolveUrlToPath(src, canonicalUrl, baseDir);

  if (!scriptPath) {
    return false;
  }

  try {
    const integrity = generateSRIHash(scriptPath);
    setAttribute(scriptTag, 'integrity', integrity);

    // Add crossorigin attribute as required for SRI
    if (!getAttribute(scriptTag, 'crossorigin')) {
      setAttribute(scriptTag, 'crossorigin', 'anonymous');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Processes link tags (stylesheets and modulepreload) and adds SRI attributes
 * @param linkTag - Link element
 * @param baseDir - Base directory for resolving relative paths
 * @param canonicalUrl - Canonical URL of the page for resolving absolute URLs
 * @returns True if SRI was added successfully
 */
function processLinkTag(
  linkTag: Element,
  baseDir: string,
  canonicalUrl: string | null
): boolean {
  const href = getAttribute(linkTag, 'href');
  const rel = getAttribute(linkTag, 'rel');

  // Only process stylesheets and modulepreload links
  if (rel !== 'stylesheet' && rel !== 'modulepreload') {
    return false;
  }

  if (!href) return false;

  // Try to resolve the URL to a local file path
  const filePath = resolveUrlToPath(href, canonicalUrl, baseDir);

  if (!filePath) {
    return false;
  }

  try {
    const integrity = generateSRIHash(filePath);
    setAttribute(linkTag, 'integrity', integrity);

    // Add crossorigin attribute as required for SRI
    if (!getAttribute(linkTag, 'crossorigin')) {
      setAttribute(linkTag, 'crossorigin', 'anonymous');
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Adds Subresource Integrity (SRI) attributes to script and link tags in an HTML file
 * @param src - Path to the HTML file on the local file system
 * @throws Error if the HTML file cannot be read or written
 */
export const addSRI = (src: string) => {
  const htmlPath = path.resolve(src);

  if (!fileExists(htmlPath)) {
    throw new Error(`HTML file not found: ${htmlPath}`);
  }

  try {
    // Read the HTML file
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Parse HTML using parse5
    const document = parse(htmlContent);

    // Get the base directory for resolving relative paths
    const baseDir = path.dirname(htmlPath);

    // Extract the canonical URL from the document
    const canonicalUrl = getCanonicalUrl(document as unknown as Element);

    let processedCount = 0;

    // Process all script tags with src attribute
    const scriptTags = getElementsByTagName(
      document as unknown as Element,
      'script'
    ).filter((script) => getAttribute(script, 'src'));

    scriptTags.forEach((scriptTag) => {
      if (processScriptTag(scriptTag, baseDir, canonicalUrl)) {
        processedCount++;
      }
    });

    // Process all link tags (stylesheets and modulepreload)
    const linkTags = getElementsByTagName(
      document as unknown as Element,
      'link'
    ).filter((link) => {
      const rel = getAttribute(link, 'rel');
      return (
        (rel === 'stylesheet' || rel === 'modulepreload') &&
        getAttribute(link, 'href')
      );
    });

    linkTags.forEach((linkTag) => {
      if (processLinkTag(linkTag, baseDir, canonicalUrl)) {
        processedCount++;
      }
    });

    // Write the modified HTML back to the file
    if (processedCount > 0) {
      const modifiedHtml = serialize(document);
      fs.writeFileSync(htmlPath, modifiedHtml, 'utf8');
    }
  } catch {
    throw new Error(`Failed to process HTML file ${htmlPath}`);
  }
};
