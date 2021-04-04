export default {
  type: 'object',
  properties: {
    root: {
      type: 'string',
      pattern: '^[A-Z][A-Z0-9]*-[A-Z0-9]+$',
      minLength: 3,
      prompt: {
        message: 'What\'s the root slug for this locale, i.e., a generic topic slug?',
        format: (text) => text.toUpperCase(),
      },
    },
    wild: {
      type: 'string',
      pattern: '[A-Z\-]*', // eslint-disable-line no-useless-escape
      prompt: {
        message: 'What\'s the wild slug for this locale, i.e., a more specific page slug?',
        format: (text) => text.toUpperCase(),
      },
    },
  },
  required: ['root', 'wild'],
};
