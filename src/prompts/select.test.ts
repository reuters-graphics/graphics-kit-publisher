import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { type Mock } from 'vitest';
import mockFs from 'mock-fs';
import { select as selectPrompt, isCancel, cancel } from '@clack/prompts';
import { select, getOrPromptTextSelect, getOrSetPkgTextSelect } from './select';
import { utils } from '@reuters-graphics/graphics-bin';
import os from 'os';
import path from 'path';

vi.mock('@clack/prompts', async () => {
  return {
    select: vi.fn(),
    isCancel: vi.fn(),
    cancel: vi.fn(),
  };
});

const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit(0) was called');
});

beforeEach(() => {
  mockFs({
    [path.join(os.homedir(), '.reuters-graphics/profile.json')]: JSON.stringify(
      {
        desk: 'london',
      }
    ),
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

describe('select prompts', () => {
  describe('select', () => {
    it('should prompt user for text and return the input value', async () => {
      (selectPrompt as Mock).mockResolvedValueOnce('london');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await select({
        message: 'Where',
        initialValue: 'new york',
        options: [{ value: 'london' }, { value: 'new york' }],
      });
      expect(selectPrompt).toHaveBeenCalledWith({
        message: 'Where',
        initialValue: 'new york',
        options: [{ value: 'london' }, { value: 'new york' }],
      });
      expect(result).toBe('london');
    });

    it('should exit if user cancels', async () => {
      (selectPrompt as Mock).mockResolvedValueOnce('london');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(true);

      await expect(
        select({
          message: 'Where',
          initialValue: 'new york',
          options: [{ value: 'london' }, { value: 'new york' }],
        })
      ).rejects.toThrow('process.exit');

      expect(cancel).toHaveBeenCalledWith('Cancelled');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('getOrPromptTextSelect', () => {
    it('should return prompt value when metadata pointer is false', async () => {
      (selectPrompt as Mock).mockResolvedValueOnce('london');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await getOrPromptTextSelect(false, {
        message: 'Where',
        initialValue: 'new york',
        options: [{ value: 'london' }, { value: 'new york' }],
      });
      expect(result).toBe('london');
      expect(selectPrompt).toHaveBeenCalled();
    });

    it('should return the value from the pointer file', async () => {
      (selectPrompt as Mock).mockResolvedValueOnce('Never called');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await getOrPromptTextSelect(
        '~/.reuters-graphics/profile.json?desk',
        {
          message: 'Where?',
          options: [{ value: 'london' }, { value: 'new york' }],
        }
      );

      expect(result).toBe('london');
      expect(selectPrompt).not.toHaveBeenCalled();
    });

    it('should prompt if the pointer value does not exist in the file', async () => {
      (selectPrompt as Mock).mockResolvedValueOnce('new york');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await getOrPromptTextSelect(
        '~/.reuters-graphics/profile.json?missingKey',
        {
          message: 'Where?',
          options: [{ value: 'london' }, { value: 'new york' }],
        }
      );

      expect(selectPrompt).toHaveBeenCalled();
      expect(result).toBe('new york');
    });

    it('should format the value', async () => {
      (selectPrompt as Mock).mockResolvedValueOnce('new york');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const pointerWithFormat = {
        path: '~/.reuters-graphics/profile.json?desk',
        format: (val: string) => val.toUpperCase(),
      };

      const result = await getOrPromptTextSelect(pointerWithFormat, {
        message: 'Where?',
        options: [{ value: 'london' }, { value: 'new york' }],
      });
      expect(result).toBe('LONDON');
      expect(selectPrompt).not.toHaveBeenCalled();
    });

    it('should validate pointer value and skip prompt if value is valid and promptAsInitial is false', async () => {
      (selectPrompt as Mock).mockResolvedValueOnce('Never called');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const pointerWithValidate = {
        path: '~/.reuters-graphics/profile.json?desk',
        validate: (value: string) => value.length > 3,
      };

      const result = await getOrPromptTextSelect(pointerWithValidate, {
        message: 'Where?',
        options: [{ value: 'london' }, { value: 'new york' }],
      });

      expect(result).toBe('london');
      expect(selectPrompt).not.toHaveBeenCalled();
    });

    it('should validate pointer value and prompt if value is valid but promptAsInitial is true', async () => {
      (selectPrompt as Mock).mockResolvedValueOnce('new york');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const pointerWithValidateAndPrompt = {
        path: '~/.reuters-graphics/profile.json?desk',
        validate: (value: string) => value.length > 3,
        promptAsInitial: true,
      };

      const result = await getOrPromptTextSelect(pointerWithValidateAndPrompt, {
        message: 'Where?',
        options: [{ value: 'london' }, { value: 'new york' }],
      });

      expect(selectPrompt).toHaveBeenCalledWith({
        message: 'Where?',
        options: [{ value: 'london' }, { value: 'new york' }],
        initialValue: 'london',
      });
      expect(result).toBe('new york');
    });
  });

  describe('getOrSetPkgTextSelect', () => {
    it('should return value if already in package.json', async () => {
      mockFs({
        [path.join(os.homedir(), '.reuters-graphics/profile.json')]:
          JSON.stringify({
            desk: 'london',
          }),
        'package.json': JSON.stringify({
          reuters: { graphic: { desk: 'singapore' } },
        }),
      });

      (selectPrompt as Mock).mockResolvedValueOnce('Never called');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const value = await getOrSetPkgTextSelect(
        'reuters.graphic.desk',
        '~/.reuters-graphics/profile.json?desk',
        { message: 'Where?', options: [] }
      );

      expect(value).toBe('singapore');
      expect(selectPrompt).not.toHaveBeenCalled();
    });

    it('should get from pointer file if not in package.json, then save to package.json', async () => {
      mockFs({
        [path.join(os.homedir(), '.reuters-graphics/profile.json')]:
          JSON.stringify({
            desk: 'london',
          }),
        'package.json': JSON.stringify({}),
      });

      const value = await getOrSetPkgTextSelect(
        'reuters.graphic.desk',
        '~/.reuters-graphics/profile.json?desk',
        { message: 'Where?', options: [] }
      );

      expect(value).toBe('london');
      expect(utils.getPkgProp('reuters.graphic.desk')).toBe('london');
    });

    it('should validate user input before saving and error if invalid', async () => {
      mockFs({
        'locales/en/metadata.json': JSON.stringify({}),
        'package.json': JSON.stringify({}),
      });

      (selectPrompt as Mock).mockResolvedValueOnce('invalid-desk');
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      await expect(
        getOrSetPkgTextSelect(
          'reuters.graphic.desk',
          '~/.reuters-graphics/profile.json?desk',
          { message: 'Where?', options: [] },
          (v: string) => {
            if (v === 'invalid-desk') throw new Error('Invalid desk');
          }
        )
      ).rejects.toThrowError('Invalid desk');
    });
  });
});
