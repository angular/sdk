const configFactory = require('./webpack.config.factory');

module.exports = configFactory({
  sourceMap: true,
  optimize: false,
});
