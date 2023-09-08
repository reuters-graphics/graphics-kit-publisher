import { Elements, TeamsKlaxon } from '@reuters-graphics/teams-klaxon';

import type { ConfigType } from '../setConfig';
import type { PromptObject } from 'prompts';
import chalk from 'chalk';
import getPackMetadata from '../prepack/getPackMetadata';
import getPkg from '../utils/getPkg';
import getServerClient from '../utils/getServerClient';
import prompts from 'prompts';
import updateGraphicPack from '../prepack/updateGraphicPack';

export default async (config: ConfigType) => {
  const pkg = getPkg();
  const { pack } = pkg.reuters.graphic;
  if (!pack) {
    console.log("Can't publish this graphic until you upload it first.");
    return;
  }

  const SERVER_CLIENT = getServerClient();

  if (process.env.GRAPHICS_SERVER_PUBLISH) {
    const MEDIA = process.env.GRAPHICS_SERVER_PUBLISH_TO_MEDIA
      ? ['media-interactive', 'EPS']
      : false;
    const LYNX = process.env.GRAPHICS_SERVER_PUBLISH_TO_LYNX
      ? ['interactive', 'JPG']
      : false;

    const packMetadata = await getPackMetadata(config);
    await updateGraphicPack(packMetadata, config);

    await SERVER_CLIENT.publishGraphic([], MEDIA, LYNX, false);
  } else {
    const questions = [
      {
        type: 'confirm',
        name: 'isCorrection',
        message: 'Are you publishing a correction?',
        initial: false,
      },
      {
        type: 'confirm',
        name: 'publishToLynx',
        message:
          'Should this graphic be published to Lynx (available to Reuters staff)?',
        initial: false,
      },
      {
        type: 'confirm',
        name: 'publishToMedia',
        message:
          'Should this graphic be published to Connect (available to clients)?',
        initial: false,
      },
    ] as PromptObject[];

    const { isCorrection, publishToLynx, publishToMedia } =
      await prompts(questions);

    const MEDIA = publishToMedia ? ['media-interactive', 'EPS'] : false;
    const LYNX = publishToLynx ? ['interactive', 'JPG'] : false;

    const packMetadata = await getPackMetadata(config);
    await updateGraphicPack(packMetadata, config);

    await SERVER_CLIENT.publishGraphic([], MEDIA, LYNX, isCorrection);
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
