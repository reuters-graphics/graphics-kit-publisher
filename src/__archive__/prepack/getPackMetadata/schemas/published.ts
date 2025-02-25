export default {
  type: 'string',
  format: 'date-time',
  prompt: {
    message: 'When is this piece publishing?',
    mask: 'YYYY-MM-DD HH:mm',
    type: 'date',
    initial: () => {
      const date = new Date();
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      return date;
    },
    format: (value: Date) => value.toISOString(),
  },
} as const;
