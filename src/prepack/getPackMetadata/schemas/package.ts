import getAuthorsSchema from './authors';
import getContactSchema from './contact';
import getDeskSchema from './desk';
import published from './published';
import slugs from './slugs';

export default () =>
  ({
    type: 'object',
    properties: {
      reuters: {
        type: 'object',
        properties: {
          contact: getContactSchema(),
          graphic: {
            type: 'object',
            properties: {
              desk: getDeskSchema(),
              slugs,
              authors: getAuthorsSchema(),
              published,
            },
            required: ['desk', 'slugs', 'authors', 'published'],
          },
        },
        required: ['contact', 'graphic'],
      },
    },
    required: ['reuters'],
  }) as const;
