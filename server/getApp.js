const app = require('./app');

function getExpressApp() {
  return app;
}

module.exports = {
  getExpressApp,
  default: app,
};
