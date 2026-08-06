declare module 'odometer' {
  interface OdometerOptions {
    el: HTMLElement;
    value: number;
    format?: string;
    theme?: string;
    duration?: number;
    animation?: 'slide' | 'count';
    formatFunction?: (value: number) => string;
  }

  export default class Odometer {
    constructor(options: OdometerOptions);
    update(value: number): void;
  }
}
