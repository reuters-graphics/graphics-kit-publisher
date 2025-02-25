import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { type Mock } from 'vitest';
import mockFs from 'mock-fs';
import { isCancel, cancel } from '@clack/prompts';
import { datetime, getOrPromptDatetime, getOrSetPkgDatetime } from './datetime';
import { utils } from '@reuters-graphics/graphics-bin';
import { datetime as datetimePrompt } from '@reuters-graphics/clack';

vi.mock('@clack/prompts', async () => {
  return {
    isCancel: vi.fn(),
    cancel: vi.fn(),
  };
});

vi.mock('@reuters-graphics/clack', async () => {
  return {
    datetime: vi.fn(),
  };
});

const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit(0) was called');
});

const testDate1 = new Date('2024-12-25');
const testDate2 = new Date('2024-09-27');
const testDate3 = new Date('2024-03-13');

beforeEach(() => {
  mockFs({
    'locales/en/metadata.json': JSON.stringify({
      published: testDate1.toISOString(),
    }),
    'package.json': JSON.stringify({}),
  });
});

afterEach(() => {
  mockFs.restore();
  vi.resetAllMocks();
});

describe('datetime prompts', () => {
  describe('datetime', () => {
    it('should prompt user for datetime and return the input value', async () => {
      (datetimePrompt as Mock).mockResolvedValueOnce(testDate1);
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await datetime({
        message: 'Enter some datetime',
        initialValue: testDate2,
      });
      expect(datetimePrompt).toHaveBeenCalledWith({
        message: 'Enter some datetime',
        initialValue: testDate2,
      });
      expect(result).toBe(testDate1);
    });

    it('should exit if user cancels', async () => {
      (datetimePrompt as Mock).mockResolvedValueOnce(testDate1);
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(true);

      await expect(
        datetime({
          message: 'Enter some datetime',
        })
      ).rejects.toThrow('process.exit');

      expect(cancel).toHaveBeenCalledWith('Cancelled');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('getOrPromptDatetime', () => {
    it('should return prompt value when metadata pointer is false', async () => {
      (datetimePrompt as Mock).mockResolvedValueOnce(testDate3);
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await getOrPromptDatetime(false, {
        message: 'Enter some datetime',
      });
      expect(result).toBe(testDate3);
      expect(datetimePrompt).toHaveBeenCalled();
    });

    it('should return the value from the pointer file', async () => {
      (datetimePrompt as Mock).mockResolvedValueOnce(testDate3);
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await getOrPromptDatetime(
        'locales/en/metadata.json?published',
        {
          message: 'Enter a datetime',
        }
      );

      expect(result).toStrictEqual(testDate1);
      expect(datetimePrompt).not.toHaveBeenCalled();
    });

    it('should prompt if the pointer value does not exist in the file', async () => {
      (datetimePrompt as Mock).mockResolvedValueOnce(testDate2);
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const result = await getOrPromptDatetime(
        'locales/en/metadata.json?missingKey',
        {
          message: 'Enter a datetime',
        }
      );

      expect(datetimePrompt).toHaveBeenCalled();
      expect(result).toBe(testDate2);
    });

    it('should format the value', async () => {
      (datetimePrompt as Mock).mockResolvedValueOnce(new Date());
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const pointerWithFormat = {
        path: 'locales/en/metadata.json?published',
        format: (date: Date) => new Date(date.setMonth(0)),
      };

      const result = await getOrPromptDatetime(pointerWithFormat, {
        message: 'Enter a datetime',
      });

      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2024);
      expect(datetimePrompt).not.toHaveBeenCalled();
    });

    it('should validate pointer value and skip prompt if value is valid and promptAsInitial is false', async () => {
      (datetimePrompt as Mock).mockResolvedValueOnce(new Date());
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const pointerWithValidate = {
        path: 'locales/en/metadata.json?published',
        validate: (value: Date) => value < new Date(),
      };

      const result = await getOrPromptDatetime(pointerWithValidate, {
        message: 'Enter a datetime',
      });

      expect(result).toStrictEqual(testDate1);
      expect(datetimePrompt).not.toHaveBeenCalled();
    });

    it('should validate pointer value and prompt if value is valid but promptAsInitial is true', async () => {
      (datetimePrompt as Mock).mockResolvedValueOnce(testDate3);
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const pointerWithValidateAndPrompt = {
        path: 'locales/en/metadata.json?published',
        validate: (value: Date) => value < new Date(),
        promptAsInitial: true,
      };

      const result = await getOrPromptDatetime(pointerWithValidateAndPrompt, {
        message: 'Enter a datetime',
      });

      expect(datetimePrompt).toHaveBeenCalledWith({
        message: 'Enter a datetime',
        initialValue: testDate1,
      });
      expect(result).toBe(testDate3);
    });
  });

  describe('getOrSetPkgText', () => {
    it('should return value if already in package.json', async () => {
      mockFs({
        'locales/en/metadata.json': JSON.stringify({
          published: testDate1.toISOString(),
        }),
        'package.json': JSON.stringify({
          reuters: { graphic: { published: testDate2.toISOString() } },
        }),
      });

      (datetimePrompt as Mock).mockResolvedValueOnce(new Date());
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      const value = await getOrSetPkgDatetime(
        'reuters.graphic.published',
        'locales/en/metadata.json?published',
        { message: 'Enter a datetime' }
      );

      expect(value).toStrictEqual(testDate2);
      expect(datetimePrompt).not.toHaveBeenCalled();
    });

    it('should get from pointer file if not in package.json, then save to package.json', async () => {
      mockFs({
        'locales/en/metadata.json': JSON.stringify({
          published: testDate1.toISOString(),
        }),
        'package.json': JSON.stringify({}),
      });

      const value = await getOrSetPkgDatetime(
        'reuters.graphic.published',
        'locales/en/metadata.json?published',
        { message: 'Enter a datetime' }
      );

      expect(value).toStrictEqual(testDate1);
      expect(utils.getPkgProp('reuters.graphic.published')).toBe(
        testDate1.toISOString()
      );
    });

    it('should validate user input before saving and error if invalid', async () => {
      mockFs({
        'locales/en/metadata.json': JSON.stringify({}),
        'package.json': JSON.stringify({}),
      });

      (datetimePrompt as Mock).mockResolvedValueOnce(new Date());
      // @ts-expect-error OK to mock
      (isCancel as Mock).mockReturnValue(false);

      await expect(
        getOrSetPkgDatetime(
          'reuters.graphic.published',
          'locales/en/metadata.json?published',
          { message: 'Enter slug' },
          (v: Date) => {
            if (v > testDate1) throw new Error('Invalid date');
          }
        )
      ).rejects.toThrowError('Invalid date');
    });
  });
});
