import { Elements, TeamsKlaxon } from '@reuters-graphics/teams-klaxon';

import type { ConfigType } from '../setConfig';
import type { PromptObject } from 'prompts';
import type { Publishing } from '@reuters-graphics/server-client';
import chalk from 'chalk';
import { flatten } from 'lodash-es';
import getEmbedEditionSlugs from '../utils/getEmbedEditionSlugs';
import getPackMetadata from '../prepack/getPackMetadata';
import getPkg from '../utils/getPkg';
import prompts from 'prompts';
import updateGraphicPack from '../prepack/updateGraphicPack';

export default async (config: ConfigType) => {
  const pkg = getPkg();
  const { pack } = pkg.reuters.graphic;
  if (!pack) {
    console.log("Can't publish this graphic until you upload it first.");
    return;
  }

  const embedEditionSlugs = getEmbedEditionSlugs(config);

  /**
   * Referrals are simply denoted with the last part of their
   * page path named "-referral". For example, a page like
   * "embeds/en/referral/index.html" turns into a "media-en-referral" slug.
   */
  const referralEmbedArchives = embedEditionSlugs
    .filter((slug) => /-referral$/.test(slug))
    .map((slug) => `${slug}.zip`);
  /**
   * Client embeds are simply not referrals.
   */
  const clientEmbedArchives = embedEditionSlugs
    .filter((slug) => !/-referral$/.test(slug))
    .map((slug) => `${slug}.zip`);
  /**
   * Public archives go outside the building, either as
   * public pages or through Reuters Connect. Excludes referrals.
   */
  const publicArchives = [
    'public.zip', // Public page archive always exists.
    ...clientEmbedArchives,
  ];
  /**
   * Embeddable archives can be embedded in dotcom articles
   * through Lynx. Excludes public page archive.
   */
  const embeddableArchives = [...clientEmbedArchives, ...referralEmbedArchives];

  /**
   * All possible media editions, used as filters in the server client.
   * (Not all of these actually will exist...)
   */
  const archivesToMedia: Publishing.PublishToMedia = flatten(
    publicArchives.map((archive) => [
      [archive, 'media-interactive'] as [string, string],
      [archive, 'EPS'] as [string, string],
    ])
  );

  /**
   * All possible Lynx editions, used as filters in the server client.
   * (Not all of these actually will exist...)
   */
  const archivesToLynx: Publishing.PublishToLynx = flatten(
    embeddableArchives.map((archive) => [
      [archive, 'interactive'] as [string, string],
      [archive, 'JPG'] as [string, string],
    ])
  );

  let serverClient;
  let revisionType: Publishing.PublishRevisionType = 'Refresh';

  if (process.env.GRAPHICS_SERVER_PUBLISH) {
    const MEDIA =
      process.env.GRAPHICS_SERVER_PUBLISH_TO_MEDIA ? archivesToMedia : false;
    const LYNX =
      process.env.GRAPHICS_SERVER_PUBLISH_TO_LYNX ? archivesToLynx : false;

    const packMetadata = await getPackMetadata(config, false);

    serverClient = await updateGraphicPack(packMetadata, config);

    await serverClient.publishGraphic(
      publicArchives,
      MEDIA,
      LYNX,
      revisionType
    );
  } else {
    const questions = [
      {
        type: 'select',
        name: 'revision',
        message: 'What type of update are you publishing?',
        choices: [
          {
            title: 'Refresh - Updates code or fixes a superficial typo',
            value: 'Refresh',
          },
          { title: 'Update - Adds new information', value: 'Update' },
          { title: 'Correction - Corrects an error', value: 'Correction' },
        ],
        initial: 0,
      },
      {
        type: 'confirm',
        name: 'publishToLynx',
        message:
          'Should this graphic be promoted in Lynx (available to embed in dotcom articles)?',
        initial: false,
      },
      {
        type: 'confirm',
        name: 'publishToMedia',
        message:
          'Should this graphic be published to Connect (available to media clients)?',
        initial: false,
      },
    ] as PromptObject[];

    const { revision, publishToLynx, publishToMedia } =
      await prompts(questions);

    revisionType = revision as 'Refresh' | 'Update' | 'Correction';

    const MEDIA = publishToMedia ? archivesToMedia : false;
    const LYNX = publishToLynx ? archivesToLynx : false;

    const packMetadata = await getPackMetadata(config, false);

    serverClient = await updateGraphicPack(packMetadata, config);

    await serverClient.publishGraphic(
      publicArchives,
      MEDIA,
      LYNX,
      revisionType
    );
  }

  console.log(chalk`\n\nPublished to: {green ${pkg.homepage}}\n`);

  if (process.env.GRAPHICS_SERVER_NOTIFY_TEAMS_CHANNEL) {
    const klaxon = new TeamsKlaxon(
      process.env.GRAPHICS_SERVER_NOTIFY_TEAMS_CHANNEL
    );
    klaxon.makeCard([Elements.TextBlock(`✅ Published to: ${pkg.homepage}`)]);
    await klaxon.postCard();
  }
};
