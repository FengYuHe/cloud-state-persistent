'use strict';

var PUBNUB = require('pubnub');

module.exports = function PubSubFacet($logs, $options) {
  var facetname = PubSubFacet.facetname;
  var options = $options[facetname];
  var log = $logs.get('state:pubsub');

  var pubnub = PUBNUB(options);

  function publish(channel, message, cb) {
    log.debug('publish message to channel', channel);
    pubnub.publish({
      channel: channel,
      message: message,
      callback: function (e) {
        log.debug("publish success!", e);
        cb();
      },
      error: cb
    });
  }

  function subscribe(channel, handler) {
    log.debug('subscribe channel', channel);
    pubnub.subscribe({
      channel: channel,
      message: function (m) {
        log.debug('received message');
        handler(null, m);
      },
      error: handler
    });
  }

  function unsubscribe(channel) {
    pubnub.unsubscribe({
      channel : channel
    });
  }

  return {
    publish: publish,
    subscribe: subscribe,
    unsubscribe: unsubscribe
  }

};
