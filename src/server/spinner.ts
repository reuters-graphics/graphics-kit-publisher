import { log, spinner } from '@clack/prompts';
import { utils } from '@reuters-graphics/graphics-bin';

const isCi = utils.environment.isCiEnvironment();

class ServerSpinner {
  private spinner: ReturnType<typeof spinner>;
  constructor() {
    this.spinner = spinner({ indicator: 'timer' });
  }

  start(msg?: string) {
    const message = msg || '📡 Sending to the graphics server';
    if (isCi) {
      log.info(message);
    } else {
      this.spinner.start(message);
    }
  }

  pause(msg?: string) {
    const message = msg || 'Need further input';
    if (isCi) {
      log.info(message);
    } else {
      this.spinner.stop(message);
    }
  }

  resume(msg?: string) {
    const message = msg || '📡 Sending to the graphics server';
    if (isCi) {
      log.info(message);
    } else {
      this.spinner.stop(message);
    }
  }

  stop(msg?: string) {
    const message = msg || 'Sent to the graphics server';
    if (isCi) {
      log.info(message);
    } else {
      this.spinner.stop(message);
    }
  }
}

export const serverSpinner = new ServerSpinner();
