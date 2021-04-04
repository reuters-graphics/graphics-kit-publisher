import getProfileProp from '../../../utils/getProfileProp';

const desks = ['bengaluru', 'london', 'new york', 'singapore'];

export default {
  type: 'string',
  enum: desks,
  prompt: {
    message: 'What desk is this project publishing from?',
    type: 'select',
    choices: [{
      title: 'Bengaluru',
      value: 'bengaluru',
    }, {
      title: 'London',
      value: 'london',
    }, {
      title: 'New York',
      value: 'new york',
    }, {
      title: 'Singapore',
      value: 'singapore',
    }],
    initial: desks.indexOf(getProfileProp('desk')),
  },
};
