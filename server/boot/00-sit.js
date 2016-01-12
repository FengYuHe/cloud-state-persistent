module.exports = function (app) {
  var sit = require('sit');
  var container = app.container = sit.container({
    app: ['value', app],
    metrics: sit.facets.metrics(),
    bus: sit.facets.mq.amqp(),
    kvstore: sit.facets.kvstore(),
    backend: sit.facets.jsonrpc.client(),
    temp: sit.facets.jsonrpc.client(),
    pubsub: require('../facets/pubsub'),
    state: require('../facets/state')(['statestore', 'statepush'], app),
    statestore: require('../facets/state-store'),
    statepush: require('../facets/state-push')
  }, app.settings);

  // initialize and start state facet
  container.get('state');
};
