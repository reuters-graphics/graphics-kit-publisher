import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { type Mock } from 'vitest';
import mockFs from 'mock-fs';
import { text as textPrompt, isCancel, cancel } from '@clack/prompts';
import { text, getOrPromptText, getOrSetPkgText } from './text';
import { utils } from '@reuters-graphics/graphics-bin';

vi.mock('@clack/prompts', async () => {
  return {
    text: vi.fn(),
    isCancel: vi.fn(),
    cancel: vi.fn(),
  };
});

const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit(0) was called');
});

beforeEach(() => {
  mockFs({
    'locales/en/metadata.json': JSON.stringify({
      story: { title: 'Hello world', authors: ['Alice', 'Bob'] },
      rootSlug: 'my-graphic',
    }),
    'package.json': JSON.stringify({}),
  });
});

afterEach(() => {
  mockFs.restore();
  vi.resetAllMocks();
});

describe('text prompts', () => {
  describe('text', () => {
    it('should prompt user for text and return the input value', async () => {
      (textPrompt as Mock).mockResolvedValueOnce('User input');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await text({
        message: 'Enter some text',
        initialValue: 'Initial',
      });
      expect(textPrompt).toHaveBeenCalledWith({
        message: 'Enter some text',
        initialValue: 'Initial',
      });
      expect(result).toBe('User input');
    });

    it('should exit if user cancels', async () => {
      (textPrompt as Mock).mockResolvedValueOnce('User input');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(true);

      await expect(
        text({
          message: 'Enter some text',
        })
      ).rejects.toThrow('process.exit');

      expect(cancel).toHaveBeenCalledWith('Cancelled');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('getOrPromptText', () => {
    it('should return prompt value when metadata pointer is false', async () => {
      (textPrompt as Mock).mockResolvedValueOnce('User input');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await getOrPromptText(false, {
        message: 'Enter some text',
      });
      expect(result).toBe('User input');
      expect(textPrompt).toHaveBeenCalled();
    });

    it('should return the value from the pointer file', async () => {
      (textPrompt as Mock).mockResolvedValueOnce('Never called');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await getOrPromptText(
        'locales/en/metadata.json?story.title',
        {
          message: 'Enter a title',
        }
      );

      expect(result).toBe('Hello world');
      expect(textPrompt).not.toHaveBeenCalled();
    });

    it('should prompt if the pointer value does not exist in the file', async () => {
      (textPrompt as Mock).mockResolvedValueOnce('User input for missing key');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await getOrPromptText(
        'locales/en/metadata.json?missingKey',
        {
          message: 'Enter something',
        }
      );

      expect(textPrompt).toHaveBeenCalled();
      expect(result).toBe('User input for missing key');
    });

    it('should format the value', async () => {
      (textPrompt as Mock).mockResolvedValueOnce('Never called');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const pointerWithFormat = {
        path: 'locales/en/metadata.json?story.authors',
        format: (arr: string[]) => arr.join(', '),
      };

      // This should transform ["Alice", "Bob"] -> "Alice, Bob"
      const result = await getOrPromptText(pointerWithFormat, {
        message: 'Enter authors',
      });
      expect(result).toBe('Alice, Bob');
      expect(textPrompt).not.toHaveBeenCalled();
    });

    it('should validate pointer value and skip prompt if value is valid and promptAsInitial is false', async () => {
      (textPrompt as Mock).mockResolvedValueOnce('Never called');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const pointerWithValidate = {
        path: 'locales/en/metadata.json?rootSlug',
        validate: (value: string) => value.length > 3,
      };

      const result = await getOrPromptText(pointerWithValidate, {
        message: 'Enter slug',
      });

      expect(result).toBe('my-graphic');
      expect(textPrompt).not.toHaveBeenCalled();
    });

    it('should validate pointer value and prompt if value is valid but promptAsInitial is true', async () => {
      (textPrompt as Mock).mockResolvedValueOnce('User updated input');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const pointerWithValidateAndPrompt = {
        path: 'locales/en/metadata.json?rootSlug',
        validate: (value: string) => value.length > 3,
        promptAsInitial: true,
      };

      const result = await getOrPromptText(pointerWithValidateAndPrompt, {
        message: 'Enter slug',
      });

      expect(textPrompt).toHaveBeenCalledWith({
        message: 'Enter slug',
        initialValue: 'my-graphic',
      });
      expect(result).toBe('User updated input');
    });
  });

  describe('getOrSetPkgText', () => {
    it('should return value if already in package.json', async () => {
      mockFs({
        'locales/en/metadata.json': JSON.stringify({
          rootSlug: 'my-graphic',
        }),
        'package.json': JSON.stringify({
          reuters: { graphic: { slugs: { root: 'existing-slug' } } },
        }),
      });

      (textPrompt as Mock).mockResolvedValueOnce('Never called');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const value = await getOrSetPkgText(
        'reuters.graphic.slugs.root',
        'locales/en/metadata.json?rootSlug',
        { message: 'Enter slug' }
      );

      expect(value).toBe('existing-slug');
      expect(textPrompt).not.toHaveBeenCalled();
    });

    it('should get from pointer file if not in package.json, then save to package.json', async () => {
      mockFs({
        'locales/en/metadata.json': JSON.stringify({
          rootSlug: 'my-graphic',
        }),
        'package.json': JSON.stringify({}),
      });

      const value = await getOrSetPkgText(
        'reuters.graphic.slugs.root',
        'locales/en/metadata.json?rootSlug',
        { message: 'Enter slug' }
      );

      expect(value).toBe('my-graphic');
      expect(utils.getPkgProp('reuters.graphic.slugs.root')).toBe('my-graphic');
    });

    it('should validate user input before saving and error if invalid', async () => {
      mockFs({
        'locales/en/metadata.json': JSON.stringify({}),
        'package.json': JSON.stringify({}),
      });

      (textPrompt as Mock).mockResolvedValueOnce('invalid-slug');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      await expect(
        getOrSetPkgText(
          'reuters.graphic.slugs.wild',
          'locales/en/metadata.json?wildSlug',
          { message: 'Enter slug' },
          (v: string) => {
            if (v !== 'valid-slug') throw new Error('Invalid slug');
          }
        )
      ).rejects.toThrowError('Invalid slug');
    });
  });
});
