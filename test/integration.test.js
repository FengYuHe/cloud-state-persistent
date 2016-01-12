'use strict';

var t = require('chai').assert;
var app = require('../');
var randomstring = require("randomstring");

describe('integration', function () {
  this.timeout(10000);

  var backend, bus, pubsub, kvstore, bucket;

  beforeEach(function () {
    backend = app.container.get('backend');
    bus = app.container.get('bus');
    pubsub = app.container.get('pubsub');
    kvstore = app.container.get('kvstore');
    bucket = kvstore.createBucket('state');
  });


  it('should save state to redis', function (done) {
    var userId = "user-1000";
    var deviceId = randomstring.generate(5);
    var channelId = randomstring.generate(5);

    var topic = userId + '.$cloud.device.' + deviceId + '.channel.' + channelId + '.event.state';
    var data = {state: 'on'};

    bus.publish('amq.topic', topic, data)
      .delay(100).then(function () {
        bucket.get(userId + ':' + deviceId + ':' + channelId, function (err, value) {
          if (err) return doen(err);
          t.deepEqual(data, value);
          done();
        });
      });
  });

  it('should push state to user channel', function (done) {
    var userId = "user-1000";
    var deviceId = randomstring.generate(5);
    var channelId = randomstring.generate(5);

    var topic = userId + '.$cloud.device.' + deviceId + '.channel.' + channelId + '.event.state';
    var data = {state: 'on'};

    backend.request('users.findPushChannels', userId).then(function (channels) {
      var channel = channels[userId];
      t.ok(channel, 'Not found push channel for user: ' + userId);
      pubsub.subscribe(channel, function (err, message) {
        if (err) return done(err);
        t.ok(message);
        t.deepEqual(message.data, data);
        pubsub.unsubscribe(channel);
        done();
      });
      setTimeout(function () {
        bus.publish('amq.topic', topic, data);
      }, 2000);
    });

  });
});
