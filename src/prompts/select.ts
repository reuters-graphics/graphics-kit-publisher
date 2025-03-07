import { cancel, isCancel, select as selectPrompt } from '@clack/prompts';
import type { MetadataPointer } from '../config/types';
import { utils } from '@reuters-graphics/graphics-bin';
import { coerceToPointerWithOptions } from './utils';

interface SelectOptions {
  /**
   * A message to prompt the user to enter the value.
   */
  message: string;
  /**
   * Initial value of the prompt.
   */
  initialValue?: string;
  options: {
    value: string;
    label?: string;
    hint?: string;
  }[];
}

export const select = async ({
  message,
  initialValue,
  options,
}: SelectOptions) => {
  const value = await selectPrompt({
    message,
    initialValue,
    options,
  });
  if (isCancel(value)) {
    cancel('Cancelled');
    process.exit(0);
  }
  return value;
};

/**
 * Get a text value from a metadata pointer or prompt for
 * it with a select if not found in the pointer file.
 * @param pointer Metadata pointer
 * @param promptOptions Text prompt options
 */
export const getOrPromptTextSelect = async <I, O>(
  pointer: MetadataPointer<I, O>,
  promptOptions: SelectOptions
) => {
  // If pointer is false, prompt the user
  if (!pointer) return select(promptOptions);
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
  if (valueInPointerFile === undefined) return select(promptOptions);
  if (format) {
    // Format the value
    valueInPointerFile = format(valueInPointerFile as I) as string;
  }
  if (validate) {
    const valueIsValid = validate(valueInPointerFile as I);
    if (valueIsValid) {
      if (promptAsInitial)
        return select({ ...promptOptions, initialValue: valueInPointerFile });
      return valueInPointerFile;
    } else {
      return select(promptOptions);
    }
  }
  if (promptAsInitial)
    return select({ ...promptOptions, initialValue: valueInPointerFile });
  return valueInPointerFile;
};

/**
 * Check package.json for a text value. If it doesn't exist, get it from a metadata pointer
 * or prompt for it with a select then save it to package.json.
 *
 * @example
 * ```typescript
 * const value = await getOrSetPkgTextSelect(
 *   'reuters.graphic.desk',
 *   '~/.reuters-graphics/profile.json?desk',
 *   {
 *     message: 'What desk is this publishing from?',
 *     options: [
 *       { value: 'london', label: 'London' },
 *       { value: 'singapore', label: 'Singapore' },
 *     ]
 *   },
 *   (value: string) => {
 *     if (!['london', 'singapore'].includes(value)) {
 *       throw new Error('Invalid desk');
 *     }
 *   }
 * );
 * ```
 *
 * @param pkgPath Path to data value in package.json
 * @param pointer Metadata pointer
 * @param promptOptions Select prompt options
 * @param validate Optional function to validate the value before finally saving it to package.json.
 */
export const getOrSetPkgTextSelect = async <I, O>(
  pkgPath: string,
  pointer: MetadataPointer<I, O>,
  promptOptions: SelectOptions,
  validate?: (v: string) => void
) => {
  // Get the value from package.json if already saved
  const savedValue = utils.getPkgProp(pkgPath) as string | undefined;
  if (savedValue) return savedValue;
  const newValue = await getOrPromptTextSelect<I, O>(pointer, promptOptions);
  if (validate) validate(newValue);
  // Save the value to package.json
  utils.setPkgProp(pkgPath, newValue);
  return newValue;
};
