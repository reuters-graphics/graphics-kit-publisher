export default {
  type: 'object',
  properties: {
    root: {
      type: 'string',
      pattern:
        "^([A-Z0-9\\&\\.\\'])(\\s?[A-Z0-9\\&\\.\\'])+(-[A-Z0-9\\&\\.\\'](\\s?[A-Z0-9\\&\\.\\'])+){1,4}$",
      minLength: 3,
      prompt: {
        message:
          "What's the root slug for this locale, i.e., a generic topic slug?",
        format: (text: string) => text.toUpperCase(),
      },
    },
    wild: {
      type: 'string',
      pattern:
        "^([A-Z0-9\\&\\.\\\\ \\s\\-\\']*)(\\s?\\([A-Z0-9\\&]+(,\\s[A-Z0-9\\&]+)*\\))?$", // eslint-disable-line no-useless-escape
      prompt: {
        message:
          "What's the wild slug for this locale, i.e., a more specific page slug?",
        format: (text: string) => text.toUpperCase(),
      },
    },
  },
  required: ['root', 'wild'],
};
