/* eslint-disable @typescript-eslint/no-explicit-any */
import { outro } from '@clack/prompts';
import { GraphicsKitPublisher } from '..';
import { intro } from '@reuters-graphics/clack';
import { loadUserConfig } from '../config/load';

/**
 * Load user config before evaluating a class method
 */
export function loadConfig(
  _target: GraphicsKitPublisher,
  _propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value!;

  descriptor.value = async function (...args: any[]) {
    if (!(this instanceof GraphicsKitPublisher)) throw Error('Bad decorator'); // Never happens...
    await loadUserConfig();
    return originalMethod.apply(this, args);
  };

  return descriptor;
}

/**
 * Wrap a class method call with clack intro and outro
 */
export function withIntroOutro(
  _target: GraphicsKitPublisher,
  _propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value!;

  descriptor.value = async function (...args: any[]) {
    if (!(this instanceof GraphicsKitPublisher)) throw Error('Bad decorator'); // Never happens...
    intro('Publisher');
    const result = await originalMethod.apply(this, args);
    outro('🏁 Done.');
    return result;
  };

  return descriptor;
}
