var Joi = require('joi');
var Boom = require('boom');

var page = {
  method: 'GET',
  path: '/api/mentions',
  config: {
    app: { hook: 'mentions.page' },
    auth: { strategy: 'jwt' },
    plugins: { track_ip: true },
    validate: {
      query: {
        limit: Joi.number(),
        page: Joi.number(),
        extended: Joi.boolean()
      }
    },
    pre: [
      { method: 'auth.mentions.page(server, auth)' },
      { method: 'hooks.preProcessing' },
      [
        { method: 'hooks.parallelProcessing', assign: 'parallelProcessed' },
        { method: processing, assign: 'processed' },
      ],
      { method: 'hooks.merge' },
      { method: 'hooks.postProcessing' }
    ]
  },
  handler: function(request, reply) {
    return reply(request.pre.processed);
  }
};

function processing(request, reply) {
  var mentioneeId = request.auth.credentials.id;
  var opts = {
    limit: request.query.limit,
    page: request.query.page,
    extended: request.query.extended
  };
  var promise = request.db.mentions.page(mentioneeId, opts);
  return reply(promise);
}

var remove = {
  method: 'DELETE',
  path: '/api/mentions',
  config: {
    auth: { strategy: 'jwt' },
    plugins: { track_ip: true },
    validate: { query: { id: Joi.string() } },
    pre: [{ method: 'auth.mentions.delete(server, auth)' }],
  },
  handler: function(request, reply) {
    var userId = request.auth.credentials.id;
    var mentionId = request.query.id;
    var promise = request.db.mentions.remove(mentionId, userId)
    .tap(function() {
      var notification = {
        channel: { type: 'user', id: userId },
        data: { action: 'refreshMentions' }
      };
      request.server.plugins.notifications.systemNotification(notification);
    });
    return reply(promise);
  }
};


var getUserIgnored = {
  method: 'GET',
  path: '/api/mentions/ignored',
  config: {
    auth: { strategy: 'jwt' },
    plugins: { track_ip: true },
    validate: { query: { username: Joi.string().required() } }
  },
  handler: function(request, reply) {
    var userId = request.auth.credentials.id;
    var ignoredUser = request.query.username;
    var promise = request.db.users.userByUsername(ignoredUser)
    .then(function(user) {
      return request.db.mentions.getUserIgnored(userId, user.id);
    })
    .catch(function() { return Boom.badRequest('Invalid Username'); });
    return reply(promise);
  }
};

var getIgnoredUsers = {
  method: 'GET',
  path: '/api/mentions/ignored/all',
  config: {
    auth: { strategy: 'jwt' },
    plugins: { track_ip: true }
  },
  handler: function(request, reply) {
    var userId = request.auth.credentials.id;
    var promise = request.db.mentions.getIgnoredUsers(userId);
    return reply(promise);
  }
};


var ignoreUser = {
  method: 'POST',
  path: '/api/mentions/ignore',
  config: {
    auth: { strategy: 'jwt' },
    plugins: { track_ip: true },
    validate: { payload: { username: Joi.string().required() } }
  },
  handler: function(request, reply) {
    var userId = request.auth.credentials.id;
    var ignoredUser = request.payload.username;
    var promise = request.db.users.userByUsername(ignoredUser)
    .then(function(user) {
      return request.db.mentions.ignoreUser(userId, user.id);
    })
    .catch(function() { return Boom.badRequest('Invalid Username'); });
    return reply(promise);
  }
};


var unignoreUser = {
  method: 'POST',
  path: '/api/mentions/unignore',
  config: {
    auth: { strategy: 'jwt' },
    plugins: { track_ip: true },
    validate: { payload: { username: Joi.string() } }
  },
  handler: function(request, reply) {
    var userId = request.auth.credentials.id;
    var ignoredUser = request.payload.username;
    var promise;
    if (ignoredUser) { // unignore one
      promise = request.db.users.userByUsername(ignoredUser)
      .then(function(user) {
        return request.db.mentions.unignoreUser(userId, user.id);
      })
      .catch(function() { return Boom.badRequest('Invalid Username'); });
    }
    else { // unignore all
      promise = request.db.mentions.unignoreUser(userId);
    }
    return reply(promise);
  }
};


module.exports = [
  page,
  remove,
  getUserIgnored,
  getIgnoredUsers,
  ignoreUser,
  unignoreUser
];