import chalk from 'chalk';
import getProfileProp from '../../../utils/getProfileProp';
import ordinal from 'ordinal';

export default () =>
  ({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          prompt: {
            message: (variablePath: string) => {
              // Will always match...
              const stringIndex = variablePath.match(/\[(\d+)\]\.name$/) || [];
              const index = parseInt(stringIndex[1]) + 1;
              return `What's the ${ordinal(index)} author's name ${chalk.grey(
                `(${variablePath})`
              )}?`;
            },
            initial: getProfileProp('name'),
          },
          minLength: 2,
        },
        link: {
          type: 'string',
          format: 'uri',
          prompt: {
            message: (variablePath: string) => {
              const stringIndex = variablePath.match(/\[(\d+)\]\.link$/) || [];
              const index = parseInt(stringIndex[1]) + 1;
              return `What's a link for the ${ordinal(
                index
              )} author ${chalk.grey(`(${variablePath})`)}?`;
            },
            initial: 'https://www.reuters.com/authors/',
          },
        },
      },
      required: ['name', 'link'],
    },
    minItems: 1,
    prompt: {
      addMessage: (_dataPath: string, currentAuthors: { name: string }[]) => {
        if (currentAuthors.length === 0) {
          return chalk`Would you like to add any additional {green authors}?`;
        }
        const authors = currentAuthors.map((a) => a.name).join(', ');
        return chalk`Would you like to add any additional {green authors} (currently ${authors})?`;
      },
    },
  }) as const;
