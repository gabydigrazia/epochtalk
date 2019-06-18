var path = require('path');
var db = require(path.normalize(__dirname + '/db'));
var routes = require(path.normalize(__dirname + '/routes'));
var plugins = require(path.normalize(__dirname + '/plugins'));

module.exports =  {
  name: 'images',
  db: db,
  routes: routes,
  routeOpts: { config: true },
  plugins: plugins
};