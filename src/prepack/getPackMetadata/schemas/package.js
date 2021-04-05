import authors from './authors';
import contact from './contact';
import desk from './desk';
import published from './published';
import slugs from './slugs';

export default {
  type: 'object',
  properties: {
    reuters: {
      type: 'object',
      properties: {
        contact,
        graphic: {
          type: 'object',
          properties: {
            desk,
            slugs,
            authors,
            published,
          },
          required: ['desk', 'slugs', 'authors', 'published'],
        },
      },
      required: ['contact', 'graphic'],
    },
  },
  required: ['reuters'],
};
