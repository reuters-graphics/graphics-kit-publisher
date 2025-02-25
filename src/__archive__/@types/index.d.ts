declare module 'ask-json' {
  import { FromSchema } from 'json-schema-to-ts';

  function askJson<T>(
    jsonSchema: T,
    rawData: unknown,
    config?: {
      askToAddItems: boolean;
    }
  ): Promise<FromSchema<T>>;

  export default askJson;
}
