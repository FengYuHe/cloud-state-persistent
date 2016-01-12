'use strict';

var util = require('util');

module.exports = function StateStoreFacet(kvstore, $logs) {
  var log = $logs.get('state:statestore');

  var bucket = kvstore.createBucket('state');

  function savePayload(params, payload, cb) {
    // [state:]123:ty3k8p67yo:on-off
    var key = util.format('%s:%s:%s', params.userId, params.deviceId, params.channelId);
    bucket.set(key, payload, function (err, reply) {
      log.debug("cache key = %s, reply = %s", bucket.getKey(key), reply);
      cb(err, reply);
    });
  }

  return function StateStore(msg, cb) {
    log.debug('amqp key: %s, payload: %dB, delivery: %s', msg.routingKey, msg.content.length, msg.deliveryTag);
    savePayload(msg.params, msg.payload, function (err) {
      if (err) log.error('failed to process payload: %s', err);
      cb(err);
    });
  }
};
