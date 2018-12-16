/*
 * Request handler of orders
 *
 */

// Dependencies
var _data = require('../../data');
var tokens = require('./tokens');
var helpers = require('../../helpers');

// Define function to call all methods handlers
var payment = function(data,callback){
  var acceptableMethods = ['post'];
  if(acceptableMethods.indexOf(data.method) > -1){
    _payment[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for all payment methods
_payment = {};

// Required data: email, payment brand
// User can pay the order and receive email after pay
_payment.post = function(data,callback){
  var email = typeof(data.payload.email) == 'string' && helpers.validateEmail(data.payload.email.trim()) ? data.payload.email.toLowerCase().trim() : false;
  var paymentBrand = typeof(data.payload.paymentBrand) == 'string' && ['visa','mastercard'].indexOf(data.payload.paymentBrand.toLowerCase()) > -1 ? data.payload.paymentBrand.toLowerCase() : false;
  var totalPrice = typeof(data.payload.totalPrice) == 'number' && data.payload.totalPrice>0 ? data.payload.totalPrice : false;
  if(email && paymentBrand && totalPrice){

    // Get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email number
    tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){

        _data.read('carts', email, function(err, cartData){
          if(!err && cartData){
            // Define the token source
            var paymentToken = 'tok_'+paymentBrand;
            // Create the date time now
            var dateTime = Date(Date.now()).toString();
            // Create the data of payment
            var amount = totalPrice;
            var currency = 'baht';
            var description = 'charge for '+email+' - '+dateTime;
            var source = paymentToken;

            // Call stripe api to transfer the money
            helpers.stripe(amount,currency,description,source,function(err){
              if(!err){
                // Store the order
                var oderId = helpers.createRandomString(20);
                var orderObject = {
                  'email' : email,
                  'totalPrice' : totalPrice,
                  'detail' : cartData,
                  'createdTime': Math.round(new Date().getTime() / 1000)
                }
                _data.create('orders',oderId,orderObject,function(err){
                  if(!err){
                    // Delete the user cart
                    _data.delete('carts',email,function(err){
                      if(!err){
                        // Send email to user after payment
                        var to = email;
                        var subject = 'Your pizza order at '+dateTime;
                        var text = 'This is you order of pizza.<br>'+cartData;

                        // Call mailgun to send the email to user
                        helpers.mailgun(to,subject,text,function(err){
                          if(!err){
                            callback(500,{'Error' : 'Could not sent the email to user'});
                          } else {
                            callback(200);
                          }
                        });
                      } else {
                        callback(500,{'Error' : 'Could not delete the user cart'});
                      }
                    });
                  } else {
                    console.log(err);
                    callback(500,{'Error' : 'Could not store the new orders'});
                  }
                });
              } else {
                console.log(err);
                callback(500,{'Error' : 'Could not transfer the money'});
              }
            });
          } else {
            callback(404,{'Error' : 'Could not find user cart data'});
          }
        })

      } else {
        callback(403,{'Error' : 'Missing required token in headers, or token is invalid'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'});
  }

}

// Export the module
module.exports = payment;
