declare module '@reuters-graphics/server-client' {
  class ServerClient {
    graphic?: {
      id: string;
      editions: {
        file: {
          fileName: string;
        };
      }[];
    };

    constructor(config: {
      username: string;
      password: string;
      apiKey: string;
      graphic?: {
        id: string;
      };
    });

    createGraphic(opts: {
      rootSlug: string;
      wildSlug?: string;
      desk: string;
      language: string;
      title: string;
      description: string;
      byline: string;
      contactEmail: string;
    }): Promise<void>;

    updateGraphic(opts: {
      rootSlug: string;
      wildSlug?: string;
      desk: string;
      language: string;
      title: string;
      description: string;
      byline: string;
      contactEmail: string;
    }): Promise<void>;

    createEditions(
      archive: string,
      fileBuffer: Buffer,
      editionMetadata: {
        language: string;
        title: string;
        description: string;
        embed?: {
          declaration: string;
          dependencies?: string;
        };
      }
    ): Promise<
      Record<
        string,
        {
          interactive: {
            url: string;
          };
        }
      >
    >;

    updateEditions(
      archive: string,
      fileBuffer: Buffer,
      editionMetadata: {
        language: string;
        title: string;
        description: string;
        embed?: {
          declaration: string;
          dependencies?: string;
        };
      }
    ): Promise<void>;

    publishGraphic(
      archives: string[],
      publishToMedia: boolean | string[],
      publishToLynx: boolean | string[],
      isCorrection: boolean
    ): Promise<void>;
  }

  export default ServerClient;
}

declare module 'ask-json' {
  import { FromSchema } from 'json-schema-to-ts';

  function askJson<T>(
    jsonSchema: T,
    rawData: any,
    config?: {
      askToAddItems: boolean;
    }
  ): Promise<FromSchema<T>>;

  export default askJson;
}
