'use strict';

var async = require('async');

module.exports = function StatePushFacet(backend, pubsub, $logs) {
  var log = $logs.get('state:statepush');

  function findPushChannels(userId) {
    // TODO redis cache for pusher channels
    return backend.request('users.findPushChannels', userId);
  }

  return function (msg, cb) {
    var userId = msg.params.userId;
    var message = {
      event: msg.params.stateOrData,
      userId: msg.params.userId,
      deviceId: msg.params.deviceId,
      channelId: msg.params.channelId,
      created: new Date(),
      data: msg.payload
    };
    findPushChannels(userId).then(function (channels) {
      var names = Object.keys(channels);
      async.map(names, function (name, callback) {
        pubsub.publish(channels[name], message, callback);
      }, cb);
    }).catch(cb);
  }
};
