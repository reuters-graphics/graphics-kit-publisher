import * as v from 'valibot';
import type { BaseSchema, BaseIssue } from 'valibot';
import { PackageMetadataError } from '../exceptions/errors';

export * as pack from './pack';
export * as archiveEdition from './archive';

type GenericSchema = BaseSchema<unknown, unknown, BaseIssue<unknown>>;

export const isValid = <T extends GenericSchema, V>(schema: T, value: V) => {
  const result = v.safeParse(schema, value);
  return result.success;
};

export const validateOrMessage = <T extends GenericSchema, V>(
  schema: T,
  value: V
) => {
  const result = v.safeParse(schema, value);
  if (!result.success) {
    const flatIssues = v.flatten(result.issues);
    return flatIssues.root?.join(' ') || 'Value is invalid';
  }
};

export const validateOrThrow = <T extends GenericSchema, V>(
  schema: T,
  value: V
) => {
  const result = v.safeParse(schema, value);
  if (result.success) {
    return result.output;
  } else {
    const errorMsgs = result.issues.map((issue) => issue.message).join(' ');
    throw new PackageMetadataError(errorMsgs || 'Data is invalid');
  }
};
