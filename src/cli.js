import GraphicsKitPublisher from '@reuters-graphics/graphics-kit-publisher';
import pkg from '../package.json';
import sade from 'sade';

const prog = sade('graphics-kit-publisher');

prog
  .version(pkg.version);

prog
  .command('greet <name>')
  .option('-h, --happy', 'Happy to see them?')
  .action((name, opts) => {
    const graphicsKitPublisher = new GraphicsKitPublisher();
    graphicsKitPublisher.greet(name, opts.happy);
  });

prog.parse(process.argv);
