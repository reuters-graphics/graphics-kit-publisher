import { VALID_LOCALES } from '../../../constants/locales';

export default {
  type: 'array',
  items: {
    type: 'object',
    properites: {
      slug: `^media-(${VALID_LOCALES.join('|')})-[a-z]+[a-z0-9-]*[a-z0-9]$`,
      url: { type: 'string', format: 'uri' },
      title: { type: 'string' },
      description: { type: 'string' },
    },
    required: ['slug', 'url', 'title', 'description'],
  },
} as const;
