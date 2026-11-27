export type MessageParams = Readonly<Record<string, string | number>>;

/**
 * Looks up copy by key (spec 6.7). Every string the user sees comes from a catalog, never from a
 * component. A missing key shows the key itself, which is loud in review and never blank.
 * `{name}` placeholders are filled from `params`; one with no value stays visible.
 */
export function createTranslator<C extends Readonly<Record<string, string>>>(catalog: C) {
  return (key: Extract<keyof C, string>, params?: MessageParams): string => {
    const lookup: Readonly<Record<string, string | undefined>> = catalog;
    const message = lookup[key] ?? key;
    if (params === undefined) return message;
    return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
      const value = params[name];
      return value === undefined ? placeholder : String(value);
    });
  };
}
