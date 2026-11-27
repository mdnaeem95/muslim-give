import { createTranslator } from '../lib/i18n';
import en from './en.json';

/** English only at launch; every string is a key so Malay can be added later (spec 6.7). */
export const t = createTranslator(en);
