import {
  groupMultiselect as groupMultiselectPrompt,
  isCancel,
  cancel,
} from '@clack/prompts';

interface GroupMultiselectOptions {
  /**
   * A message to prompt the user to make a selection.
   */
  message: string;
  /**
   * Options keyed by the group they belong to. Groups are selectable, so a whole
   * group can be taken or dropped in one keystroke.
   */
  options: Record<
    string,
    {
      value: string;
      label?: string;
      hint?: string;
    }[]
  >;
  initialValues?: string[];
  maxItems?: number;
  required?: boolean;
}

/**
 * Prompt for multiple values, grouped
 */
export const groupMultiselect = async ({
  message,
  options,
  initialValues,
  maxItems,
  required,
}: GroupMultiselectOptions) => {
  const value = await groupMultiselectPrompt({
    message,
    options,
    initialValues,
    maxItems,
    required,
  });

  if (isCancel(value)) {
    cancel('Cancelled');
    process.exit(0);
  }
  return value;
};
