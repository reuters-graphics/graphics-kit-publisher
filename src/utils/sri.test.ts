import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import dedent from 'dedent';
import fs from 'fs';
import { addSRI } from './sri';

describe('addSRI', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('relative paths', () => {
    beforeEach(() => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="stylesheet" href="styles.css">
            <script src="script.js"></script>
          </head>
          <body></body>
          </html>`,
        'styles.css': 'body { margin: 0; }',
        'script.js': 'console.log("hello");',
      });
    });

    it('adds SRI attributes to relative script and stylesheet paths', () => {
      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');

      expect(html).toContain('integrity="sha384-');
      expect(html).toContain('crossorigin="anonymous"');

      // Should have integrity on both link and script
      const linkMatches = html.match(/link[^>]*integrity/gi);
      const scriptMatches = html.match(/script[^>]*integrity/gi);
      expect(linkMatches).toHaveLength(1);
      expect(scriptMatches).toHaveLength(1);
    });

    it('preserves existing crossorigin attributes', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <script src="script.js" crossorigin="use-credentials"></script>
          </head>
          <body></body>
          </html>`,
        'script.js': 'console.log("test");',
      });

      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');
      expect(html).toContain('crossorigin="use-credentials"');
      expect(html).not.toContain('crossorigin="anonymous"');
    });

    it('does not modify HTML if no resources to process', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Test</title>
          </head>
          <body></body>
          </html>`,
      });

      const originalHtml = fs.readFileSync('index.html', 'utf8');
      addSRI('index.html');
      const newHtml = fs.readFileSync('index.html', 'utf8');

      expect(newHtml).toBe(originalHtml);
    });

    it('skips resources that do not exist on disk', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="stylesheet" href="missing.css">
            <script src="exists.js"></script>
          </head>
          <body></body>
          </html>`,
        'exists.js': 'console.log("exists");',
      });

      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');

      // Should only add integrity to the existing script
      expect(html.match(/integrity/g)).toHaveLength(1);
      expect(html).toContain('<script src="exists.js"');
    });
  });

  describe('absolute same-domain URLs with canonical URL', () => {
    beforeEach(() => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="canonical" href="https://example.com/graphics/my-project/">
            <link rel="stylesheet" href="https://example.com/graphics/my-project/styles.css">
            <script src="https://example.com/graphics/my-project/script.js"></script>
          </head>
          <body></body>
          </html>`,
        'styles.css': 'body { color: red; }',
        'script.js': 'alert("test");',
      });
    });

    it('adds SRI to absolute same-domain URLs', () => {
      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');

      expect(html).toContain('integrity="sha384-');
      const integrityMatches = html.match(/integrity="sha384-/g);
      expect(integrityMatches).toHaveLength(2); // One for stylesheet, one for script
    });

    it('resolves paths relative to HTML file location', () => {
      mockFs({
        dist: {
          page: {
            'index.html': dedent`
              <!DOCTYPE html>
              <html>
              <head>
                <link rel="canonical" href="https://example.com/graphics/project/page/">
                <script src="https://example.com/graphics/project/page/app.js"></script>
              </head>
              <body></body>
              </html>`,
            'app.js': 'console.log("app");',
          },
        },
      });

      addSRI('dist/page/index.html');

      const html = fs.readFileSync('dist/page/index.html', 'utf8');
      expect(html).toContain('integrity="sha384-');
    });

    it('skips external cross-domain URLs', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="canonical" href="https://example.com/my-page/">
            <link rel="stylesheet" href="https://cdn.example.com/styles.css">
            <script src="https://different-domain.com/script.js"></script>
            <script src="//another-domain.com/script.js"></script>
          </head>
          <body></body>
          </html>`,
      });

      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');
      expect(html).not.toContain('integrity');
    });

    it('handles URLs without canonical tag by only processing relative paths', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="stylesheet" href="https://example.com/styles.css">
            <link rel="stylesheet" href="local.css">
          </head>
          <body></body>
          </html>`,
        'local.css': 'body { margin: 0; }',
        'styles.css': 'body { padding: 0; }',
      });

      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');

      // Should only process the relative path
      const integrityMatches = html.match(/integrity/g);
      expect(integrityMatches).toHaveLength(1);
      expect(html).toContain('href="local.css" integrity=');
    });
  });

  describe('modulepreload links', () => {
    beforeEach(() => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="modulepreload" href="module.js">
            <link rel="preload" href="font.woff2" as="font">
            <link rel="stylesheet" href="styles.css">
          </head>
          <body></body>
          </html>`,
        'module.js': 'export default "module";',
        'font.woff2': 'font-data',
        'styles.css': 'body { margin: 0; }',
      });
    });

    it('adds SRI to modulepreload links', () => {
      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');

      // Should have integrity on modulepreload and stylesheet, but not preload
      const modulepreloadMatch = html.match(
        /<link rel="modulepreload"[^>]*integrity/
      );
      const stylesheetMatch = html.match(
        /<link rel="stylesheet"[^>]*integrity/
      );
      const preloadMatch = html.match(/<link rel="preload"[^>]*integrity/);

      expect(modulepreloadMatch).toBeTruthy();
      expect(stylesheetMatch).toBeTruthy();
      expect(preloadMatch).toBeFalsy();
    });

    it('adds SRI to modulepreload with absolute same-domain URLs', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="canonical" href="https://example.com/app/">
            <link rel="modulepreload" href="https://example.com/app/chunk.js">
          </head>
          <body></body>
          </html>`,
        'chunk.js': 'export const chunk = true;',
      });

      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');
      expect(html).toContain('rel="modulepreload"');
      expect(html).toContain('integrity="sha384-');
    });
  });

  describe('mixed scenarios', () => {
    beforeEach(() => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="canonical" href="https://example.com/graphics/project/">
            <link rel="stylesheet" href="https://example.com/graphics/project/styles.css">
            <link rel="stylesheet" href="https://cdn.cloudflare.com/external.css">
            <link rel="modulepreload" href="https://example.com/graphics/project/app.js">
            <link rel="preload" href="image.png" as="image">
            <script src="relative.js"></script>
            <script src="https://example.com/graphics/project/absolute.js"></script>
            <script src="https://external.com/lib.js"></script>
            <script>console.log("inline");</script>
          </head>
          <body></body>
          </html>`,
        'styles.css': 'body { margin: 0; }',
        'app.js': 'export const app = true;',
        'relative.js': 'console.log("relative");',
        'absolute.js': 'console.log("absolute");',
      });
    });

    it('processes only same-domain and relative resources', () => {
      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');

      // Count integrity attributes
      const integrityMatches = html.match(/integrity="sha384-/g);
      expect(integrityMatches).toHaveLength(4);

      // Verify external resources are not modified
      expect(html).toContain('https://cdn.cloudflare.com/external.css">');
      expect(html).not.toContain('external.css" integrity');
      expect(html).toContain('https://external.com/lib.js"></script>');
      expect(html).not.toContain('lib.js" integrity');

      // Verify inline script is not modified
      expect(html).toContain('<script>console.log("inline");</script>');
    });

    it('generates different hashes for different files', () => {
      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');

      // Extract all integrity values
      const integrityRegex = /integrity="(sha384-[^"]+)"/g;
      const hashes = new Set();
      let match;

      while ((match = integrityRegex.exec(html)) !== null) {
        hashes.add(match[1]);
      }

      // Should have unique hashes for each file
      expect(hashes.size).toBeGreaterThan(1);
    });
  });

  describe('nested pages with separate CDN directories', () => {
    it('handles nested HTML files with absolute URLs to CDN assets', () => {
      mockFs({
        embeds: {
          en: {
            map: {
              'index.html': dedent`
                <!DOCTYPE html>
                <html>
                <head>
                  <link rel="canonical" href="https://example.com/graphics/my-project/embeds/en/map/">
                  <link rel="stylesheet" href="https://example.com/graphics/my-project/cdn/styles.css">
                  <script src="https://example.com/graphics/my-project/cdn/app.js"></script>
                  <link rel="modulepreload" href="https://example.com/graphics/my-project/cdn/chunk.js">
                </head>
                <body></body>
                </html>`,
            },
          },
        },
        cdn: {
          'styles.css': 'body { margin: 0; }',
          'app.js': 'console.log("app");',
          'chunk.js': 'export const chunk = true;',
        },
      });

      addSRI('embeds/en/map/index.html');

      const html = fs.readFileSync('embeds/en/map/index.html', 'utf8');

      // Should add integrity to all three CDN resources
      const integrityMatches = html.match(/integrity="sha384-/g);
      expect(integrityMatches).toHaveLength(3);

      // Verify all resources have integrity
      expect(html).toContain('cdn/styles.css" integrity="sha384-');
      expect(html).toContain('cdn/app.js" integrity="sha384-');
      expect(html).toContain('cdn/chunk.js" integrity="sha384-');
    });

    it('handles mix of relative and absolute CDN paths from nested HTML', () => {
      mockFs({
        embeds: {
          en: {
            map: {
              'index.html': dedent`
                <!DOCTYPE html>
                <html>
                <head>
                  <link rel="canonical" href="https://example.com/graphics/my-project/embeds/en/map/">
                  <link rel="stylesheet" href="https://example.com/graphics/my-project/cdn/styles.css">
                  <script src="../../../cdn/local-relative.js"></script>
                  <link rel="preload" href="local.png" as="image">
                </head>
                <body></body>
                </html>`,
              'local.png': 'png-data',
            },
          },
        },
        cdn: {
          'styles.css': 'body { margin: 0; }',
          'local-relative.js': 'console.log("relative");',
        },
      });

      addSRI('embeds/en/map/index.html');

      const html = fs.readFileSync('embeds/en/map/index.html', 'utf8');

      // Should add integrity to stylesheet and script, but not preload
      const integrityMatches = html.match(/integrity="sha384-/g);
      expect(integrityMatches).toHaveLength(2);

      // Verify both absolute CDN and relative CDN paths work
      expect(html).toContain('cdn/styles.css" integrity="sha384-');
      expect(html).toContain(
        '../../../cdn/local-relative.js" integrity="sha384-'
      );
      expect(html).not.toContain('local.png" integrity');
    });
  });

  describe('error handling', () => {
    it('throws error if HTML file does not exist', () => {
      mockFs({});

      expect(() => addSRI('nonexistent.html')).toThrow('HTML file not found: ');
    });

    it('handles nested directory structures', () => {
      mockFs({
        dist: {
          assets: {
            'app.js': 'console.log("app");',
            'styles.css': 'body { margin: 0; }',
          },
          'index.html': dedent`
            <!DOCTYPE html>
            <html>
            <head>
              <link rel="stylesheet" href="assets/styles.css">
              <script src="assets/app.js"></script>
            </head>
            <body></body>
            </html>`,
        },
      });

      addSRI('dist/index.html');

      const html = fs.readFileSync('dist/index.html', 'utf8');
      expect(html.match(/integrity/g)).toHaveLength(2);
    });

    it('handles protocol-relative URLs as external', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <script src="//cdn.example.com/script.js"></script>
          </head>
          <body></body>
          </html>`,
      });

      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');
      expect(html).not.toContain('integrity');
    });
  });

  describe('hash generation', () => {
    beforeEach(() => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <script src="script.js"></script>
          </head>
          <body></body>
          </html>`,
        'script.js': 'console.log("test");',
      });
    });

    it('generates valid SHA-384 hashes', () => {
      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');
      const match = html.match(/integrity="(sha384-[A-Za-z0-9+/=]+)"/);

      expect(match).toBeTruthy();
      expect(match![1]).toMatch(/^sha384-[A-Za-z0-9+/=]{64}$/);
    });

    it('generates consistent hashes for the same file', () => {
      addSRI('index.html');
      const html1 = fs.readFileSync('index.html', 'utf8');
      const hash1 = html1.match(/integrity="(sha384-[^"]+)"/)?.[1];

      // Restore and re-run
      mockFs.restore();
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <script src="script.js"></script>
          </head>
          <body></body>
          </html>`,
        'script.js': 'console.log("test");',
      });

      addSRI('index.html');
      const html2 = fs.readFileSync('index.html', 'utf8');
      const hash2 = html2.match(/integrity="(sha384-[^"]+)"/)?.[1];

      expect(hash1).toBe(hash2);
    });
  });

  describe('edge cases', () => {
    it('handles empty href/src attributes', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="stylesheet" href="">
            <script src=""></script>
            <script src="valid.js"></script>
          </head>
          <body></body>
          </html>`,
        'valid.js': 'console.log("valid");',
      });

      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');
      const integrityMatches = html.match(/integrity/g);
      expect(integrityMatches).toHaveLength(1); // Only the valid script
    });

    it('handles links without href attribute', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="stylesheet">
            <script></script>
          </head>
          <body></body>
          </html>`,
      });

      expect(() => addSRI('index.html')).not.toThrow();
    });

    it('handles files with special characters in paths', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <script src="my-script.min.js"></script>
          </head>
          <body></body>
          </html>`,
        'my-script.min.js': 'console.log("minified");',
      });

      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');
      expect(html).toContain('integrity="sha384-');
    });

    it('handles multiple canonical tags by using the first one', () => {
      mockFs({
        'index.html': dedent`
          <!DOCTYPE html>
          <html>
          <head>
            <link rel="canonical" href="https://example.com/first/">
            <link rel="canonical" href="https://example.com/second/">
            <script src="https://example.com/first/script.js"></script>
          </head>
          <body></body>
          </html>`,
        'script.js': 'console.log("test");',
      });

      addSRI('index.html');

      const html = fs.readFileSync('index.html', 'utf8');
      expect(html).toContain('integrity="sha384-');
    });
  });
});
