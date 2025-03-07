import { isCancel, cancel } from '@clack/prompts';
import { datetime as datetimePrompt } from '@reuters-graphics/clack';
import { utils } from '@reuters-graphics/graphics-bin';
import type { MetadataPointer } from '../config/types';
import {
  coerceToPointerWithOptions,
  parseDateOrThrow,
  parseDate,
} from './utils';

interface DatetimeOptions {
  /**
   * A message to prompt the user to enter the value.
   */
  message: string;
  /**
   * Initial value of the prompt.
   */
  initialValue?: Date;
  /**
   * Validator passed to user prompt.
   *
   * If the value is invalid, return a message that describes
   * what's wrong to the user.
   *
   * @example
   * ```typescript
   * {
   *   validate: (value: Date) => {
   *     if (value < new Date()) {
   *       return 'Date must be in the future';
   *     }
   *   }
   * }
   * ```
   *
   * @param value value from prompt
   * @returns Message or Error if value is invalid
   */
  validate?: (value: Date) => string | Error | undefined;
}

/**
 * Prompt for a datetime value
 */

export const datetime = async ({
  message,
  initialValue,
  validate,
}: DatetimeOptions) => {
  const value = await datetimePrompt({
    message,
    initialValue,
    validate,
  });

  if (isCancel(value)) {
    cancel('Cancelled');
    process.exit(0);
  }
  return value;
};

/**
 * Get a datetime value from a metadata pointer or prompt for
 * it if not found in the pointer file.
 * @param pointer Metadata pointer
 * @param promptOptions Datetime prompt options
 */
export const getOrPromptDatetime = async <I, O>(
  pointer: MetadataPointer<I, O>,
  promptOptions: DatetimeOptions
) => {
  // If pointer is false, prompt the user
  if (!pointer) return datetime(promptOptions);
  const { path, validate, format, promptAsInitial } =
    coerceToPointerWithOptions(pointer);

  let valueInPointerFile: Date | undefined;
  // Check for a value in the pointer file
  try {
    valueInPointerFile = parseDateOrThrow(
      utils.fs.get(path) as string | undefined
    );
  } catch {
    // continue on any file errors
  }
  // If no value found in pointer file, prompt the user
  if (valueInPointerFile === undefined) return datetime(promptOptions);
  if (format) {
    // Format the value
    valueInPointerFile = format(valueInPointerFile as I) as Date;
  }
  if (validate) {
    const valueIsValid = validate(valueInPointerFile as I);
    if (valueIsValid) {
      if (promptAsInitial)
        return datetime({ ...promptOptions, initialValue: valueInPointerFile });
      return valueInPointerFile;
    } else {
      return datetime(promptOptions);
    }
  }
  if (promptAsInitial)
    return datetime({ ...promptOptions, initialValue: valueInPointerFile });
  return valueInPointerFile;
};

/**
 * Check package.json for a datetime value. If it doesn't exist, get it from a metadata pointer
 * or prompt for it then save it to package.json.
 *
 * @example
 * ```typescript
 * const value = await getOrSetPkgDatetime(
 *   'reuters.graphic.published',
 *   'metadata.json?published',
 *   { message: "When will you publish?" },
 *   (value: Date) => {
 *     if (isNaN(value.getTime())) {
 *       throw new Error('Invalid slug');
 *     }
 *   }
 * );
 * ```
 *
 * @param pkgPath Path to data value in package.json
 * @param pointer Metadata pointer
 * @param promptOptions Datetime prompt options
 * @param validate Optional function to validate the value before finally saving it to package.json.
 */
export const getOrSetPkgDatetime = async <I, O>(
  pkgPath: string,
  pointer: MetadataPointer<I, O>,
  promptOptions: DatetimeOptions,
  validate?: (v: Date) => void
) => {
  // Get the value from package.json if already saved
  const savedValue = parseDate(utils.getPkgProp(pkgPath) as string | undefined);
  if (savedValue) return savedValue;
  const newValue = await getOrPromptDatetime<I, O>(pointer, promptOptions);
  if (validate) validate(newValue);
  // Save the value to package.json
  utils.setPkgProp(pkgPath, newValue.toISOString());
  return newValue;
};
