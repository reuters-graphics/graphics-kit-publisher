import { spinner } from '@clack/prompts';

class ServerSpinner {
  private spinner: ReturnType<typeof spinner>;
  constructor() {
    this.spinner = spinner({ indicator: 'timer' });
  }

  start(msg?: string) {
    this.spinner.start(msg || '📡 Sending to the graphics server');
  }

  pause(msg?: string) {
    this.spinner.stop(msg || 'Need further input');
  }

  resume(msg?: string) {
    this.spinner.start(msg || '📡 Sending to the graphics server');
  }

  stop(msg?: string) {
    this.spinner.stop(msg || 'Sent to the graphics server');
  }
}

export const serverSpinner = new ServerSpinner();
