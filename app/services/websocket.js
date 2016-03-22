'use strict';
/* jslint node: true */

module.exports = ['$window', 'Session',
  function($window, Session) {
    // Initiate the connection to the server
    var socketcluster = require('socketcluster-client');
    var socket = socketcluster.connect({
      hostname: forumData.websocket_host,
      port: forumData.websocket_port,
      autoReconnect: true
    })
    .on('error', function(err) {
      console.log('Oh hey, a websocket error ocurred!', err);
    });
    return socket;
  }
];
