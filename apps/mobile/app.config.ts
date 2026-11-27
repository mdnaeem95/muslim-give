import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One app per environment, installable side by side (spec 19.1). The environment comes from
 * `APP_ENV`, set by the EAS build profile; production builds have no runtime switch.
 * Final identifiers depend on the domain chosen in spec section 22.
 */
const ENVIRONMENTS = {
  development: { id: 'sg.muslimgive.app.dev', name: 'Muslim Give (Dev)' },
  staging: { id: 'sg.muslimgive.app.staging', name: 'Muslim Give (Staging)' },
  production: { id: 'sg.muslimgive.app', name: 'Muslim Give' },
} as const;

type AppEnvironment = keyof typeof ENVIRONMENTS;

const isEnvironment = (value: unknown): value is AppEnvironment =>
  value === 'staging' || value === 'production';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Typed `unknown`: the environment's own typing is looser than it looks.
  const requested: unknown = process.env.APP_ENV;
  const environment: AppEnvironment = isEnvironment(requested) ? requested : 'development';
  const { id, name } = ENVIRONMENTS[environment];
  return {
    ...config,
    name,
    slug: 'muslim-give',
    scheme: 'muslimgive',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    ios: { bundleIdentifier: id, supportsTablet: false },
    android: { package: id },
    plugins: ['expo-router', 'expo-status-bar'],
    extra: { appEnvironment: environment },
  };
};
