import { describe, it, expect } from 'vitest';

import * as validators from '.';

describe('validators', () => {
  it('should validate', () => {
    let result = validators.isValid(validators.pack.Desk, 'london');
    expect(result).toBe(true);

    result = validators.isValid(validators.pack.Desk, 'los angeles');
    expect(result).toBe(false);
  });

  it('should validateOrThrow', () => {
    expect(() => {
      validators.validateOrThrow(validators.pack.Desk, 'london');
    }).not.toThrowError();

    expect(() => {
      validators.validateOrThrow(validators.pack.Desk, 'los angeles');
    }).toThrowError('Desk is not a valid option.');
  });
});
