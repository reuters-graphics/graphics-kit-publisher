import getProfileProp from '../../../utils/getProfileProp';

export default () => ({
  type: 'object',
  properties: {
    name: {
      type: 'string',
      prompt: {
        message: () => 'What\'s the contact author\'s name?',
        initial: getProfileProp('name'),
      },
      minLength: 2,
    },
    email: {
      type: 'string',
      format: 'email',
      prompt: {
        message: () => 'What\'s the contact author\'s email?',
        initial: getProfileProp('email'),
      },
    },
  },
  required: ['name', 'email'],
});
