// jsdom ships no types and @types/jsdom is not a dependency; the kit needs only a window's document.
declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string);
    readonly window: Window & typeof globalThis;
  }
}
