const configFactory = require('./webpack.config.factory');

module.exports = configFactory({
  sourceMap: false,
  optimize: true,
});
