import { Locator, Page } from '@playwright/test';
import { LocatorDef } from './locators';

export type Params = Record<string, string | number>;

function fill(text: string, params: Params): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in params)) throw new Error(`Missing locator param "${key}" for "${text}"`);
    return String(params[key]);
  });
}

const f = (v: string | RegExp, p: Params) => (typeof v === 'string' ? fill(v, p) : v);

/** Turns a definition from locators.ts into a real (lazy) Playwright Locator. */
export function resolve(page: Page, def: LocatorDef, params: Params = {}): Locator {
  let loc: Locator;
  switch (def.type) {
    case 'css': loc = page.locator(fill(def.value, params)); break;
    case 'xpath': loc = page.locator(`xpath=${fill(def.value, params)}`); break;
    case 'testId': loc = page.getByTestId(fill(def.value, params)); break;
    case 'role':
      loc = page.getByRole(def.value, {
        name: def.name === undefined ? undefined : f(def.name, params),
        exact: def.exact,
      });
      break;
    case 'text': loc = page.getByText(f(def.value, params), { exact: def.exact }); break;
    case 'label': loc = page.getByLabel(f(def.value, params), { exact: def.exact }); break;
    case 'placeholder': loc = page.getByPlaceholder(f(def.value, params), { exact: def.exact }); break;
    case 'altText': loc = page.getByAltText(f(def.value, params), { exact: def.exact }); break;
    case 'title': loc = page.getByTitle(f(def.value, params), { exact: def.exact }); break;
  }
  return def.nth === undefined ? loc : loc.nth(def.nth);
}
