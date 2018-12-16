/*
 * Request handler of menus
 *
 */

// Dependencies
var _data = require('../../data');
var tokens = require('./tokens');
var helpers = require('../../helpers');

// Define function to call all methods handlers
var menus = function(data,callback){
  var acceptableMethods = ['get'];
  if(acceptableMethods.indexOf(data.method) > -1){
    _menus[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for all menus methods
_menus = {};

// Required data: email
// User can get all menus if loggined
_menus.get = function(data,callback){
  var email = typeof(data.queryStringObject.email) == 'string' && helpers.validateEmail(data.queryStringObject.email.toLowerCase().trim()) ? data.queryStringObject.email.trim() : false;
  if(email){

    // Get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email number
    tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Show all menus to user
        _data.read('menus','menus',function(err,menuData){
          if(!err && menuData){
            callback(200,menuData);
          } else {
            callback(403,{'Error' : 'Could not send the menu to user'});
          }
        });
      } else {
        callback(403,{'Error' : 'Missing required token in headers, or token is invalid'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
  // Get the token from the headers
  var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
}

// Export the module
module.exports = menus;
