import { Locator, Page } from '@playwright/test';
import { LocatorDef } from '../locators/locators';
import { Params, resolve } from '../locators/resolve';

/** Every page object extends this. Use `this.loc(L.name)` to get a Locator from locators.ts. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected loc(def: LocatorDef, params?: Params): Locator {
    return resolve(this.page, def, params);
  }
}
