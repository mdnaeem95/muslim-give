const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The workspace packages are TypeScript sources whose imports end in `.js` (`./result.js` for
// `result.ts`), as TypeScript requires for ES modules. Metro does not map that, so try the name
// without the extension first and let Metro find the `.ts` file.
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstream ?? context.resolveRequest;
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    try {
      return resolve(context, moduleName.slice(0, -3), platform);
    } catch {
      // Not a TypeScript source after all: resolve the name as written.
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
