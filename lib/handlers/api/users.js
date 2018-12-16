/*
 * Request handler of users
 *
 */

// Dependencies
var _data = require('../../data');
var helpers = require('../../helpers');
var tokens = require('./tokens');

// Define function to call all methods handlers
var users = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    _users[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for the users methods
_users = {};

// Users - post
// Required data: firstname, lastname, email, password, address, tosAgreement
// Optional data: none
_users.post = function(data,callback){
  // Check that all required fields are filled out. If missing, push the missing text
  var firstname = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastname = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var email = typeof(data.payload.email) == 'string' && helpers.validateEmail(data.payload.email.trim()) ? data.payload.email.trim().toLowerCase() : false;
  var address = typeof(data.payload.address) == 'string' && data.payload.address.trim().length > 0 ? data.payload.address.trim() : false;
  var paymentType = typeof(data.payload.paymentType) == 'string' && data.payload.paymentType.trim().length > 0 ? data.payload.paymentType.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if(firstname && lastname && email && password && address && paymentType && tosAgreement){
    // Make sure that the user already exist
    _data.read('users',email,function(err,data){
      if(err){
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if(hashedPassword){
          var userObject = {
            'firstname' : firstname,
            'lastname' : lastname,
            'email' : email,
            'address' : address,
            'paymentType' : paymentType,
            'hashedPassword' : hashedPassword,
            'tosAgreement' : true,
            'createdTime': Math.round(new Date().getTime() / 1000)
          };

          // Store the user
          _data.create('users',email,userObject,function(err){
            if(!err){
              callback(200);
            } else {
              console.log(err);
              callback(500,{'Error' : 'Could not create the new user'});
            }
          });
        } else {
          callback(500,{'Error' : 'Could not hash the user\'s password'});
        }

      } else {
        // User already exists
        callback(400,{'Error' : 'A user with that email number already exists'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }
};

// Users - get
// Required data: email
// Optional data: none
_users.get = function(data,callback){
  // Check that the email number is valid
  var email = typeof(data.queryStringObject.email) == 'string' && helpers.validateEmail(data.queryStringObject.email.trim()) ? data.queryStringObject.email.toLowerCase().trim() : false;
  if(email){

    // Get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email number
    tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the user
        _data.read('users',email,function(err,data){
          if(!err && data){
            // Remove the hashed password from user object before returning it to requester
            delete data.hashedPassword;
            callback(200,data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403,{'Error' : 'Missing required token in headers, or token is invalid'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

// Users - put
// Required data: email
// Optional data: firstname, lastname, address, password (at least one must be specified)
_users.put = function(data,callback){
  // Check for the required field
  var email = typeof(data.payload.email) == 'string' && helpers.validateEmail(data.payload.email.trim()) ? data.payload.email.toLowerCase().trim() : false;

  // Check for the optional fields
  var firstname = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastname = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var address = typeof(data.payload.address) == 'string' && data.payload.address.trim().length > 0 ? data.payload.address.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if the email is invalid
  if(email){
    // Error if nothing is sent to update
    if(firstname || lastname || address || password){

      // Get the token from the headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      // Verify that the given token is valid for the email number
      tokens.verifyToken(token,email,function(tokenIsValid){
        if(tokenIsValid){
          // Lookup the user
          _data.read('users',email,function(err,userData){
            if(!err && userData){
              // Update the fields necessary
              if(firstname){
                userData.firstname = firstname;
              }
              if(lastname){
                userData.lastname = lastname;
              }
              if(address){
                userData.address = address;
              }
              if(password){
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the new update
              _data.update('users',email,userData,function(err){
                if(!err){
                  callback(200);
                } else {
                  console.log(err);
                  callback(500,{'Error' : 'Could not be update the user'});
                }
              });
            } else {
              callback(400,{'Error' : 'The specified user dose not exist'});
            }
          });
        } else {
          callback(403,{'Error' : 'Missing required token in headers, or token is invalid'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing fields to update'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

// Users - delete
// Required data: email
_users.delete = function(data,callback){
  // Check that the email is valid
  var email = typeof(data.queryStringObject.email) == 'string' && helpers.validateEmail(data.queryStringObject.email.toLowerCase().trim()) ? data.queryStringObject.email.trim() : false;
  if(email){

    // Get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email number
    tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the user
        _data.read('users',email,function(err,userData){
          if(!err && userData){
            _data.delete('users',email,function(err){
              if(!err){
                // Also delete cart of user (if have)
                _data.read('carts',email,function(err,data){
                  if(!err && data){
                    _data.delete('carts',email,function(err){
                      if(!err){
                        callback(200);
                      } else {
                        console.log(err);
                        callback(500,{'Error' : 'Could not delete user cart'});
                      }
                    });
                  } else {
                    callback(200);
                  }
                });
              } else {
                callback(500,{'Error' : 'Could not delete the specified user'});
              }
            });
          } else {
            callback(404,{'Error' : 'Could not find the specified user'});
          }
        });
      } else {
        callback(403,{'Error' : 'Missing required token in headers, or token is invalid'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
};

// Export the module
module.exports = users;
