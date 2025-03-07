import { text as textPrompt, isCancel, cancel } from '@clack/prompts';
import { utils } from '@reuters-graphics/graphics-bin';
import type { MetadataPointer } from '../config/types';
import { coerceToPointerWithOptions } from './utils';

interface TextOptions {
  /**
   * A message to prompt the user to enter the value.
   */
  message: string;
  /**
   * Initial value of the prompt.
   */
  initialValue?: string;
  placeholder?: string;
  /**
   * Validator passed to user prompt.
   *
   * If the value is invalid, return a message that describes
   * what's wrong to the user.
   *
   * @example
   * ```typescript
   * {
   *   validate: (value: string) => {
   *     if (value.length < 3) {
   *       return 'Value should be longer than 3 character';
   *     }
   *   }
   * }
   * ```
   *
   * @param value value from prompt
   * @returns Message or Error if value is invalid
   */
  validate?: (value: string) => string | Error | undefined;
  /**
   * Whether a blank value is allowed, defaults to `true`.
   */
  required?: boolean;
}

/**
 * Prompt for a text value
 */

export const text = async ({
  message,
  initialValue,
  placeholder,
  validate,
}: TextOptions) => {
  const value = await textPrompt({
    message,
    initialValue,
    placeholder,
    validate,
  });

  if (isCancel(value)) {
    cancel('Cancelled');
    process.exit(0);
  }
  return value;
};

/**
 * Get a text value from a metadata pointer or prompt for
 * it if not found in the pointer file.
 * @param pointer Metadata pointer
 * @param promptOptions Text prompt options
 */
export const getOrPromptText = async <I, O>(
  pointer: MetadataPointer<I, O>,
  promptOptions: TextOptions
) => {
  // If pointer is false, prompt the user
  if (!pointer) return text(promptOptions);
  const { path, validate, format, promptAsInitial } =
    coerceToPointerWithOptions(pointer);

  let valueInPointerFile: string | undefined;
  // Check for a value in the pointer file
  try {
    valueInPointerFile = utils.fs.get(path) as string | undefined;
  } catch {
    // continue on any file errors
  }
  // If no value found in pointer file, prompt the user
  if (valueInPointerFile === undefined) return text(promptOptions);
  if (format) {
    // Format the value
    valueInPointerFile = format(valueInPointerFile as I) as string;
  }
  if (validate) {
    const valueIsValid = validate(valueInPointerFile as I);
    if (valueIsValid) {
      if (promptAsInitial)
        return text({ ...promptOptions, initialValue: valueInPointerFile });
      return valueInPointerFile;
    } else {
      return text(promptOptions);
    }
  }
  if (promptAsInitial)
    return text({ ...promptOptions, initialValue: valueInPointerFile });
  return valueInPointerFile;
};

/**
 * Check package.json for a text value. If it doesn't exist, get it from a metadata pointer
 * or prompt for it then save it to package.json.
 *
 * @example
 * ```typescript
 * const value = await getOrSetPkgText(
 *   'reuters.graphic.slugs.root',
 *   'metadata.json?rootSlug',
 *   { message: "What's the root slug?" },
 *   (value: string) => {
 *     if (/[a-z]+[a-z0-9]?/.test(string)) {
 *       throw new Error('Invalid slug');
 *     }
 *   }
 * );
 * ```
 *
 * @param pkgPath Path to data value in package.json
 * @param pointer Metadata pointer
 * @param promptOptions Text prompt options
 * @param validate Optional function to validate the value before finally saving it to package.json.
 */
export const getOrSetPkgText = async <I, O>(
  pkgPath: string,
  pointer: MetadataPointer<I, O>,
  promptOptions: TextOptions,
  validate?: (v: string) => void
) => {
  const isRequired = promptOptions.required ?? true;
  // Get the value from package.json if already saved
  const savedValue = utils.getPkgProp(pkgPath) as string | undefined;
  if (!isRequired && savedValue !== undefined) return savedValue;
  if (savedValue) return savedValue;
  const newValue = await getOrPromptText<I, O>(pointer, promptOptions);
  if (validate) validate(newValue);
  // Save the value to package.json
  utils.setPkgProp(pkgPath, isRequired ? newValue : (newValue ?? ''));
  return newValue;
};
