'use strict';

var log4js = require('log4js');
const config = require('../config/log4js');

log4js.configure(config.log4js);

/**
 * log4jsのシャットダウン
 */
const customShutdown = num => {
  log4js.shutdown(() => {
    process.exit(num);
  });
};

module.exports = {
  system: log4js.getLogger('system'),
  shutdown: customShutdown
};
