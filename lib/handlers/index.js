/*
 * Request handlers
 *
 */

// Dependencies
var indexTemplate = require('./templates/index');
var accountTemplate = require('./templates/accounts');
var sessionTemplate = require('./templates/sessions');
var faviconTemplate = require('./templates/favicon');
var publicTemplate = require('./templates/public');
var getMenu = require('./templates/menus');
var getCart = require('./templates/carts');
var users = require('./api/users');
var tokens = require('./api/tokens');
var menus = require('./api/menus');
var carts = require('./api/carts');
var orders = require('./api/orders');

// Define the handlers
var handlers = {};

/*
 * Template handlers
 *
 */

 // Index
 handlers.index = function(data,callback){
   indexTemplate(data,callback);
 };

 // Account create
handlers.accountCreate = function(data,callback){
  accountTemplate.accountCreate(data,callback);
};

// Account edit
handlers.accountEdit = function(data,callback){
 accountTemplate.accountEdit(data,callback);
};

// Account delete
handlers.accountDeleted = function(data,callback){
 accountTemplate.accountDeleted(data,callback);
};

// Session create
handlers.sessionCreate = function(data,callback){
 sessionTemplate.sessionCreate(data,callback);
};

// Session delete
handlers.sessionDeleted = function(data,callback){
 sessionTemplate.sessionDeleted(data,callback);
};

 // Favicon
handlers.favicon = function(data,callback){
  faviconTemplate(data,callback);
};

// Public assets
handlers.public = function(data,callback){
  publicTemplate(data,callback);
};

//  Menus
handlers.getMenu = function(data,callback){
  getMenu(data,callback);
};

//  Carts
handlers.getCart = function(data,callback){
  getCart(data,callback);
};

/*
 * API handlers
 *
 */

// Users
handlers.users = function(data,callback){
  users(data,callback);
};

// Tokens
handlers.tokens = function(data,callback){
  tokens(data,callback);
};

// Menus
handlers.menus = function(data,callback){
  menus(data,callback);
};

// Carts
handlers.carts = function(data,callback){
  carts(data,callback);
};

// Payment
handlers.orders = function(data,callback){
  orders(data,callback);
};

//  Not found handlers
handlers.notFound = function(data,callback){
  callback(404);
};

// Export the handlers
module.exports = handlers;
