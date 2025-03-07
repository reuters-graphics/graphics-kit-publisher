import type {
  MetadataPointer,
  MetadataPointerWithOptions,
} from '../config/types';

export const coerceToPointerWithOptions = <I, O>(
  pointer: MetadataPointer<I, O>
) => {
  if (typeof pointer === 'string') {
    return { path: pointer } as MetadataPointerWithOptions<I, O>;
  } else {
    return pointer as MetadataPointerWithOptions<I, O>;
  }
};

/**
 * Attempts to parse a string into a valid Date.
 *
 * @param dateString - The date string to parse (e.g. "2025-01-01").
 * @returns A valid Date object if parsing succeeds.
 * @throws Error if the string cannot be parsed into a valid Date.
 */
export const parseDateOrThrow = (dateString: string | undefined) => {
  if (!dateString) throw new Error('Invalid date');

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }

  return date;
};

/**
 * Attempts to parse a string into a valid Date.
 *
 * @param dateString - The date string to parse (e.g. "2025-01-01").
 * @returns A valid Date object if parsing succeeds.
 */
export const parseDate = (dateString: string | undefined) => {
  if (!dateString) return;

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return;

  return date;
};
