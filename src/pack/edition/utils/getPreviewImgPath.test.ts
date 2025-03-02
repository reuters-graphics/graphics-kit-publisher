import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import { getPreviewImagePath } from './getPreviewImgPath';
import dedent from 'dedent';

afterEach(() => {
  mockFs.restore();
});

describe('getPreviewImgPath', async () => {
  it('should pack up', async () => {
    mockFs({
      'dist/index.html': dedent`<html>
      <head>
      <link rel="canonical" href="https://www.reuters.com/graphics/my-project/" />
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
      </head>
      </html>`,
      'dist/cdn/images/my-image.jpg': '',
    });

    const previewImgPath = await getPreviewImagePath('dist/index.html');

    expect(previewImgPath).toBe('dist/cdn/images/my-image.jpg');
  });

  it('should error if file does not exist', async () => {
    mockFs({
      'dist/index.html': dedent`<html>
      <head>
      <link rel="canonical" href="https://www.reuters.com/graphics/my-project/" />
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
      </head>
      </html>`,
    });

    await expect(() => getPreviewImagePath('dist/index.html')).rejects.toThrow(
      'Preview image detected in metadata but not found'
    );
  });

  it('should error if invalid image type', async () => {
    mockFs({
      'dist/index.html': dedent`<html>
      <head>
      <link rel="canonical" href="https://www.reuters.com/graphics/my-project/" />
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.mp4" />
      </head>
      </html>`,
    });

    await expect(() => getPreviewImagePath('dist/index.html')).rejects.toThrow(
      'Invalid preview image type'
    );
  });

  it('should error if no og:image', async () => {
    mockFs({
      'dist/index.html': dedent`<html>
      <head>
      <link rel="canonical" href="https://www.reuters.com/graphics/my-project/" />
      </head>
      </html>`,
    });

    await expect(() => getPreviewImagePath('dist/index.html')).rejects.toThrow(
      'No "og:image" tag found'
    );
  });

  it('should error if no canonical URL', async () => {
    mockFs({
      'dist/index.html': dedent`<html>
      <head>
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
      </head>
      </html>`,
    });

    await expect(() => getPreviewImagePath('dist/index.html')).rejects.toThrow(
      'No canonical link found'
    );
  });

  it('should return prefab preview JPG', async () => {
    mockFs({
      'dist/index.html': dedent`<html>
      <head>
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
      </head>
      </html>`,
      'dist/_gfxpreview.jpg': '',
    });

    const previewImgPath = await getPreviewImagePath('dist/index.html');

    expect(previewImgPath).toBe('dist/_gfxpreview.jpg');
  });

  it('should return prefab preview PNG', async () => {
    mockFs({
      'dist/index.html': dedent`<html>
      <head>
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
      </head>
      </html>`,
      'dist/_gfxpreview.png': '',
    });

    const previewImgPath = await getPreviewImagePath('dist/index.html');

    expect(previewImgPath).toBe('dist/_gfxpreview.png');
  });
});
