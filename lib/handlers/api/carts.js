/*
 * Request handler of carts
 *
 */

// Dependencies
var _data = require('../../data');
var helpers = require('../../helpers');
var tokens = require('./tokens');

// Define function to call all methods handlers
var carts = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    _carts[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for all carts methods
_carts = {};

// Carts - post
// Required data: email, menuId
// Create the cart .If user already have cart, delete it and new create
_carts.post = function(data,callback){
  // Check for the required field
  var email = typeof(data.payload.email) == 'string' && helpers.validateEmail(data.payload.email.trim()) ? data.payload.email.toLowerCase().trim() : false;
  var menuSelects = typeof(data.payload.menuSelects) == 'object' && data.payload.menuSelects instanceof Array && data.payload.menuSelects.length > 0 ? data.payload.menuSelects : false;
  if(email && menuSelects){

    // Get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the email
    tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the menu
        _data.read('menus','menus',function(err,data){
          if(!err && data){
            var menuList = data.items;
            // Container for menu list id that user selected
            var cartList = [];
            // check the menu id that user selected and each menu id are match
            menuSelects.forEach(function(menuSelect){
              menuList.forEach(function(menu){
                if(menuSelect.id==menu.id){
                  if(menuSelect.quantity>0){
                    cartList.push(menuSelect);
                  }
                }
              });
            });
            // Convert selected list from array to json
            var cartListJson = {items : cartList};

            // Check that user already have select list (cart). If already have, remove it
            _data.read('carts',email,function(err,cartData){
              if(!err && cartData){
                // Remove the previous cart for store new cart
                _data.delete('carts',email,function(err){
                  if(!err){
                    // Store the new user cart
                    _data.create('carts',email,cartListJson,function(err){
                      if(!err){
                        callback(200);
                      } else {
                        callback(500,{'Error' : 'Could not store the menu that user selected'});
                      }
                    });
                  } else {
                    callback(500)
                  }
                });
              } else {
                // Create and store the new user cart
                _data.create('carts',email,cartListJson,function(err){
                  if(!err){
                    callback(200);
                  } else {
                    callback(500,{'Error' : 'Could not store the menu that user selected'});
                  }
                });
              }
            });
          } else {
            callback(500,{'Error' : 'Could not find the menus'});
          }
        });
      } else {
        callback(403,{'Error' : 'Missing required token in headers, or token is invalid'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
}

// Carts - get
// Required data: email
// Get the cart data
_carts.get = function(data,callback){
  var email = typeof(data.queryStringObject.email) == 'string' && helpers.validateEmail(data.queryStringObject.email.trim()) ? data.queryStringObject.email.toLowerCase().trim() : false;
  if(email){

    // Get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email
    tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Find the cart of user. If cannot find, return error
        _data.read('carts',email,function(err,cartData){
          if(!err && cartData){
            _data.read('menus','menus',function(err,menuData){
              if(!err && menuData){
                // Container for menus in cart
                var userCart = [];

                // Campare all menus with each menu id in user cart
                cartData.items.forEach(function(cart){
                  menuData.items.forEach(function(menu){
                    if(cart.id == menu.id){
                      menu.quantity = cart.quantity
                      menu.calPrice = cart.quantity*menu.price
                      userCart.push(menu);
                    }
                  });
                });
                callback(200,{'menus' : userCart});
              } else {
                callback(500,{'Error' : 'Could not find the menus'});
              }
            });
          } else {
            callback(404,{'Error' : 'User didn\'t have the cart'});
          }
        });
      } else {
        callback(403,{'Error' : 'Missing required token in headers, or token is invalid'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
}

// Carts - put
// Required data: email, menuId
// Change the cart data
_carts.put = function(data,callback){
  // Check for the required field
  var email = typeof(data.payload.email) == 'string' && helpers.validateEmail(data.payload.email.trim()) ? data.payload.email.toLowerCase().trim() : false;
  var menuSelects = typeof(data.payload.menuSelects) == 'object' && data.payload.menuSelects instanceof Array && data.payload.menuSelects.length > 0 ? data.payload.menuSelects : false;
  if(email && menuSelects){

    // Get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email
    tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Check that user already have cart
        _data.read('carts',email,function(err,cartData){
          if(!err && cartData){
            // Remove the previous cart for store new cart
            _data.delete('carts',email,function(err){
              if(!err){
                _data.read('menus','menus',function(err,data){
                  if(!err && data){
                    var menuList = data.items;
                    // Container for menu list id that user selected
                    var newCartList = [];
                    // check the menu id that user selected and each menu id are match
                    menuSelects.forEach(function(menuSelect){
                      menuList.forEach(function(menu){
                        if(menuSelect.id==menu.id){
                          newCartList.push(menuSelect);
                        }
                      });
                    });
                    // Convert selected list from array to json
                    var newCartListJsos = {items : newCartList};
                    // Store the new user cart
                    _data.create('carts',email,newCartListJsos,function(err){
                      if(!err){
                        callback(200);
                      } else {
                        callback(500,{'Error' : 'Could not store the menu that user selected'});
                      }
                    });
                  } else {
                    callback(500,{'Error' : 'Could not find the menus'});
                  }
                });
              } else {
                callback(500)
              }
            });
          } else {
            callback(404,{'Error' : 'Could not find user cart'});
          }
        });
      } else {
        callback(403,{'Error' : 'Missing required token in headers, or token is invalid'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
}

// Carts - delete
// Required data: email
// Delete the cart
_carts.delete = function(data,callback){
  var email = typeof(data.queryStringObject.email) == 'string' && helpers.validateEmail(data.queryStringObject.email.trim()) ? data.queryStringObject.email.toLowerCase().trim() : false;
  if(email){

    // Get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email
    tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Check that user already have cart
        _data.read('carts',email,function(err,cartData){
          if(!err && cartData){
            // Remove the user cart
            _data.delete('carts',email,function(err){
              if(!err){
                callback(200);
              } else {
                callback(500,{'Error' : 'Could not delete user cart'});
              }
            });
          } else {
            callback(404,{'Error' : 'Could not find user cart'});
          }
        });
      } else {
        callback(403,{'Error' : 'Missing required token in headers, or token is invalid'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }
}


// Export the module
module.exports = carts;
