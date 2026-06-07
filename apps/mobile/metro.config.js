const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: workspace kökünü izle + hem yerel hem kök node_modules'tan çöz.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// NodeNext tarzı ('./x.js') göreli importları TS kaynağına eşle.
// tsc bunları çözer ama Metro varsayılan olarak çözmez.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if ((moduleName.startsWith('./') || moduleName.startsWith('../')) && moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    } catch {
      // çözülemezse varsayılan çözücüye düş
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
