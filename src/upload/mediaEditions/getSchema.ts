import { VALID_LOCALES } from '../../constants/locales';
import chalk from 'chalk';

export default ({
  slug,
  title: defaultTitle,
  description: defaultDescription,
}: {
  slug: string;
  title: string;
  description: string;
}) => ({
  type: 'object',
  properties: {
    slug: {
      type: 'string',
      pattern: `^media-(${VALID_LOCALES.join(
        '|'
      )})-[a-zA-Z]+[a-zA-Z0-9-]*[a-zA-Z0-9]$`,
    },
    title: {
      type: 'string',
      prompt: {
        message: chalk`What\'s the title of {yellow ${slug}}?`,
        initial: defaultTitle,
      },
    },
    description: {
      type: 'string',
      prompt: {
        message: chalk`What\'s the description of {yellow ${slug}}?`,
        initial: defaultDescription,
      },
    },
  },
  required: ['slug', 'title', 'description'],
});
