'use strict';

var async = require('async');
var request = require('request');

var STATE_ROUTING_KEY = ":userId.$cloud.device.:deviceId.channel.:channelId.event.:stateOrData";

module.exports = function (handlers, app) {
  if (handlers && !Array.isArray(handlers)) handlers = [handlers];

  return function StateFacet(container, bus, metrics, $logs, $options) {
    var facetname = StateFacet.facetname;
    var options = $options[facetname];
    var log = $logs.get('state');

    var broker = new StateBroker(bus, metrics, log, options);

    if (handlers) {
      handlers.forEach(function (handler) {
        log.debug('add handler:', handler || 'anonymous');
        broker.add(container.get(handler));
      });
    }

    broker.start(app);
  }
};

function StateBroker(bus, metrics, log, option) {
  this.bus = bus;
  this.log = log;

  this.c = metrics.channel('timeseries.messages_processed');
  this.t = metrics.channel('timeseries.messages_processed_time');

  this._handlers = [];

}

StateBroker.prototype.add = function (handler) {
  this._handlers.push(handler);
};

StateBroker.prototype.start = function (app) {

  var opts = {
    queue: 'state.service',
    queueOpts: {
      messageTtl: 600000, // How long to retain messages in the queue (10 minutes)
      durable: false
    }
  };

  var log = this.log;
  var c = this.c;
  var t = this.t;
  var handlers = this._handlers;
  log.debug('subscribe amqp', STATE_ROUTING_KEY);
  this.bus.subscribe(STATE_ROUTING_KEY, opts, function dispatch(message) {
    c.inc();
     delete message.payload["$b"];

    //time series database
    setTemp(app, message, log);

    //callback user
    callbackToUser(app, message, log);

    log.debug('message dispatching');
    var msg = decode(message);
    var start = Date.now();
    async.map(handlers, function (handler, cb) {
      handler(msg, cb);
    }, function (err) {
      if (err) log.error(err);
      log.debug('message dispatched');
      t.timing(start);
    });
  });
};

function decode(message) {
  return {
    routingKey: message.fields.routingKey,
    deliveryTag: message.fields.deliveryTag,
    params: message.params,
    content: message.content,
    payload: message.payload
  }
}

function setTemp(app, message, log){
  var container = app.container;
  var temp = container.get('temp');
  var data = {
    owner: message.params.userId,
    deviceId: message.params.deviceId,
    channelId: message.params.channelId,
    created: new Date(),
    type: message.params.stateOrData,
    passage: 'mqtt',
    data: message.payload
  };
  temp.request(message.params.stateOrData + '.create', message.params.userId, data).then(function(result){
    log.debug('set Temp:', result);
  });
}

function callbackToUser(app, message, log){
  var container = app.container;
  var backend = container.get('backend');
  backend.request('users.getUserInfo', message.params.userId).timeout(25000).then(function(result){
    if(result && result.callback){
      var form = {
        owner: message.params.userId,
        deviceId: message.params.deviceId,
        channelId: message.params.channelId,
        created: new Date(),
        type: message.params.stateOrData,
        passage: 'mqtt',
        data: message.payload
      }
      request.post(result.callback, {form:form, timeout: 3000}, function(err, res, body){
        if(err){
          if(err.code==='ETIMEDOUT'){
            log.debug('callback User err: timed out after 3000ms');
          }else{
            log.debug('callback User err:', err);
          }
        }else{
          log.debug('callback User success:', body);
        }
      });
      log.debug('callback User:', form);
    }
  });
}
