import sade from 'sade';
import { version } from '../package.json';
import { GraphicsKitPublisher } from '.';
import { handleError } from './exceptions/errors';

const prog = sade('graphics-publisher');

prog.version(version);

prog.command('preview').action(async () => {
  try {
    const graphicsPublisher = new GraphicsKitPublisher();
    await graphicsPublisher.preview();
  } catch (error) {
    handleError(error);
  }
});

prog.command('upload').action(async () => {
  try {
    const graphicsPublisher = new GraphicsKitPublisher();
    await graphicsPublisher.upload();
  } catch (error) {
    handleError(error);
  }
});

prog.command('upload:quick').action(async () => {
  try {
    const graphicsPublisher = new GraphicsKitPublisher();
    await graphicsPublisher.uploadPublicOnly();
  } catch (error) {
    handleError(error);
  }
});

prog.command('publish').action(async () => {
  try {
    const graphicsPublisher = new GraphicsKitPublisher();
    await graphicsPublisher.publish();
  } catch (error) {
    handleError(error);
  }
});

prog.command('restart').action(async () => {
  try {
    const graphicsPublisher = new GraphicsKitPublisher();
    await graphicsPublisher.restart();
  } catch (error) {
    handleError(error);
  }
});

prog.command('delete').action(async () => {
  try {
    const graphicsPublisher = new GraphicsKitPublisher();
    await graphicsPublisher.delete();
  } catch (error) {
    handleError(error);
  }
});

prog.parse(process.argv);
