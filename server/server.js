var loopback = require('loopback');
var boot = require('loopback-boot');
var os = require('os');
var chalk = require('chalk');

var app = module.exports = loopback();

app.start = function (cb) {
  // start the web server
  return app.listen(function () {
    app.emit('started');
    console.log('Hostname', os.hostname());
    console.log('Cloud state service listening at: %s within %s environment', app.get('url'), app.get('env'));
    if (cb) cb();
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function (err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module) {
    app.start();
  }
});
