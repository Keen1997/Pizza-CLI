/*
 * Frontend Logic for application
 *
 */

// Container for frontend application
var app = {};

// Config
app.config = {
  'sessionToken' : false
};

// AJAX Client (for RESTful API)
app.client = {}

// Interface for making API calls
app.client.request = function(headers,path,method,queryStringObject,payload,callback){

  // Set defaults
  headers = typeof(headers) == 'object' && headers !== null ? headers : {};
  path = typeof(path) == 'string' ? path : '/';
  method = typeof(method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof(payload) == 'object' && payload !== null ? payload : {};
  callback = typeof(callback) == 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  var requestUrl = path+'?';
  var counter = 0;
  for(var queryKey in queryStringObject){
     if(queryStringObject.hasOwnProperty(queryKey)){
       counter++;
       // If at least one query string parameter has already been added, preprend new ones with an ampersand
       if(counter > 1){
         requestUrl+='&';
       }
       // Add the key and value
       requestUrl+=queryKey+'='+queryStringObject[queryKey];
     }
  }

  // Form the http request as a JSON type
  var xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-type", "application/json");

  // For each header sent, add it to the request
  for(var headerKey in headers){
     if(headers.hasOwnProperty(headerKey)){
       xhr.setRequestHeader(headerKey, headers[headerKey]);
     }
  }

  // If there is a current session token set, add that as a header
  if(app.config.sessionToken){
    xhr.setRequestHeader("token", app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE) {
        var statusCode = xhr.status;
        var responseReturned = xhr.responseText;

        // Callback if requested
        if(callback){
          try{
            var parsedResponse = JSON.parse(responseReturned);
            callback(statusCode,parsedResponse);
          } catch(e){
            callback(statusCode,false);
          }

        }
      }
  }

  // Send the payload as JSON
  var payloadString = JSON.stringify(payload);
  xhr.send(payloadString);

};

// Bind the logout button
app.bindLogoutButton = function(){
  document.getElementById("logoutButton").addEventListener("click", function(e){

    // Stop it from redirecting anywhere
    e.preventDefault();

    // Log the user out
    app.logUserOut();

  });
};

// Log the user out then redirect them
app.logUserOut = function(redirectUser){
  // Set redirectUser to default to true
  redirectUser = typeof(redirectUser) == 'boolean' ? redirectUser : true;

  // Get the current token id
  var tokenId = typeof(app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;

  // Send the current token to the tokens endpoint to delete it
  var queryStringObject = {
    'id' : tokenId
  };
  app.client.request(undefined,'api/tokens','DELETE',queryStringObject,undefined,function(statusCode,responsePayload){
    // Set the app.config token as false
    app.setSessionToken(false);

    // Send the user to the logged out page
    if(redirectUser){
      window.location = '/session/deleted';
    }

  });
};

// Bind the forms
app.bindForms = function(){
  if(document.querySelector("form")){

    var allForms = document.querySelectorAll("form");
    for(var i = 0; i < allForms.length; i++){
        allForms[i].addEventListener("submit", function(e){

        // Stop it from submitting
        e.preventDefault();
        var formId = this.id;
        var path = this.action;
        var method = this.method.toUpperCase();

        // Hide the error message (if it's currently shown due to a previous error)
        document.querySelector("#"+formId+" .formError").style.display = 'none';

        // Hide the success message (if it's currently shown due to a previous error)
        if(document.querySelector("#"+formId+" .formSuccess")){
          document.querySelector("#"+formId+" .formSuccess").style.display = 'none';
        }


        // Turn the inputs into a payload
        var payload = {};
        var elements = this.elements;
        for(var i = 0; i < elements.length; i++){
          if(elements[i].type !== 'submit'){
            // Determine class of element and set value accordingly
            var classOfElement = typeof(elements[i].classList.value) == 'string' && elements[i].classList.value.length > 0 ? elements[i].classList.value : '';
            var valueOfElement = elements[i].type == 'checkbox' && classOfElement.indexOf('multiselect') == -1 ? elements[i].checked : classOfElement.indexOf('intval') == -1 ? elements[i].value : parseInt(elements[i].value);
            var elementIsChecked = elements[i].checked;
            // Override the method of the form if the input's name is _method
            var nameOfElement = elements[i].name;
            if(nameOfElement == '_method'){
              method = valueOfElement;
            } else {
              // Create an payload field named "method" if the elements name is actually httpmethod
              if(nameOfElement == 'httpmethod'){
                nameOfElement = 'method';
              }
              // Create an payload field named "id" if the elements name is actually uid
              if(nameOfElement == 'uid'){
                nameOfElement = 'id';
              }
              // If the element has the class "multiselect" add its value(s) as array elements
              if(classOfElement.indexOf('multiselect') > -1){
                if(elementIsChecked){
                  payload[nameOfElement] = typeof(payload[nameOfElement]) == 'object' && payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
                  payload[nameOfElement].push(valueOfElement);
                }
              } else {
                payload[nameOfElement] = valueOfElement;
              }

            }
          }
        }


        // If the method is DELETE, the payload should be a queryStringObject instead
        var queryStringObject = method == 'DELETE' ? payload : {};

        // Call the API
        app.client.request(undefined,path,method,queryStringObject,payload,function(statusCode,responsePayload){
          // Display an error on the form if needed
          if(statusCode !== 200){

            if(statusCode == 403){
              // log the user out
              app.logUserOut();

            } else {

              // Try to get the error from the api, or set a default error message
              var error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';

              // Set the formError field with the error text
              document.querySelector("#"+formId+" .formError").innerHTML = error;

              // Show (unhide) the form error field on the form
              document.querySelector("#"+formId+" .formError").style.display = 'block';
            }
          } else {
            // If successful, send to form response processor
            app.formResponseProcessor(formId,payload,responsePayload);
          }

        });
      });
    }
  }
};

// Form response processor
app.formResponseProcessor = function(formId,requestPayload,responsePayload){
  var functionToCall = false;
  // If account creation was successful, try to immediately log the user in
  if(formId == 'accountCreate'){
    // Take the email and password, and use it to log the user in
    var newPayload = {
      'email' : requestPayload.email,
      'password' : requestPayload.password
    };

    app.client.request(undefined,'api/tokens','POST',undefined,newPayload,function(newStatusCode,newResponsePayload){
      // Display an error on the form if needed
      if(newStatusCode !== 200){

        // Set the formError field with the error text
        document.querySelector("#"+formId+" .formError").innerHTML = 'Sorry, an error has occured. Please try again.';

        // Show (unhide) the form error field on the form
        document.querySelector("#"+formId+" .formError").style.display = 'block';

      } else {
        // If successful, set the token and redirect the user
        app.setSessionToken(newResponsePayload);
        window.location = 'menus';
      }
    });
  }
  // If login was successful, set the token in localstorage and redirect the user
  if(formId == 'sessionCreate'){
    app.setSessionToken(responsePayload);
    window.location = 'menus';
  }

  // If forms saved successfully and they have success messages, show them
  var formsWithSuccessMessages = ['accountEdit1', 'accountEdit2','checksEdit1'];
  if(formsWithSuccessMessages.indexOf(formId) > -1){
    document.querySelector("#"+formId+" .formSuccess").style.display = 'block';
  }

  // If the user just deleted their account, redirect them to the account-delete page
  if(formId == 'accountEdit3'){
    app.logUserOut(false);
    window.location = '/account/deleted';
  }

  // If the user just deleted a check, redirect them to the dashboard
  if(formId == 'checksEdit2'){
    window.location = '';
  }

};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = function(){
  var tokenString = localStorage.getItem('token');
  if(typeof(tokenString) == 'string'){
    try{
      var token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if(typeof(token) == 'object'){
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    }catch(e){
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = function(add){
  var target = document.querySelector("body");
  if(add){
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn');
  }
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = function(token){
  app.config.sessionToken = token;
  var tokenString = JSON.stringify(token);
  localStorage.setItem('token',tokenString);
  if(typeof(token) == 'object'){
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

// Renew the token
app.renewToken = function(callback){
  var currentToken = typeof(app.config.sessionToken) == 'object' ? app.config.sessionToken : false;
  if(currentToken){

    // Update the token with a new expiration
    var payload = {
      'id' : currentToken.id,
      'extend' : true,
    };
    app.client.request(undefined,'api/tokens','PUT',undefined,payload,function(statusCode,responsePayload){

      // Display an error on the form if needed
      if(statusCode == 200){

        // Get the new token details
        var queryStringObject = {'id' : currentToken.id};
        app.client.request(undefined,'api/tokens','GET',queryStringObject,undefined,function(statusCode,responsePayload){

          // Display an error on the form if needed
          if(statusCode == 200){
            app.setSessionToken(responsePayload);
            callback(false);
          } else {
            app.setSessionToken(false);
            callback(true);
          }
        });
      } else {
        app.setSessionToken(false);
        callback(true);
      }
    });
  } else {
    app.setSessionToken(false);
    callback(true);
  }
};

// Load data on the page
app.loadDataOnPage = function(){
  // Get the current page from the body class
  var bodyClasses = document.querySelector("body").classList;
  var primaryClass = typeof(bodyClasses[0]) == 'string' ? bodyClasses[0] : false;

  // Logic forindex
  if(primaryClass == 'index'){
    app.loadIndex();
  }

  // Logic for account settings page
  if(primaryClass == 'accountEdit'){
    app.loadAccountEditPage();
  }

  // Logic for menus list page
  if(primaryClass == 'menusList'){
    app.loadMenuPage();
  }

  // Logic for cart page
  if(primaryClass == 'cartList'){
    app.loadCartPage();
  }
};

app.loadIndex = function(){

  // Get the email number from the current token, or log the user out if none is there
  var email = typeof(app.config.sessionToken.email) == 'string' ? app.config.sessionToken.email : false;

  // If not loggined, create button for singup and login
  if(!email){
    var signupBtn =  '<a class="cta green" href="account/create">Get Started</a>';
    var space = '<span style="margin:0px 5px;"></span>'
    var loginBtn = '<a class="cta blue" href="session/create">Login</a>';
    document.getElementById('mainIndex').innerHTML = signupBtn+space+loginBtn;

  // If loggined, create button to get into menu
  } else {
    var MenuBtn = '<a class="cta green" href="menus">Get Menu</a>';
    document.getElementById('mainIndex').innerHTML = MenuBtn;
  }
}

// Load the account edit page specifically
app.loadAccountEditPage = function(){
  // Get the email number from the current token, or log the user out if none is there
  var email = typeof(app.config.sessionToken.email) == 'string' ? app.config.sessionToken.email : false;
  if(email){

    // Fetch the user data
    var queryStringObject = {
      'email' : email
    };
    app.client.request(undefined,'api/users','GET',queryStringObject,undefined,function(statusCode,responsePayload){
      if(statusCode == 200){
        // Put the data into the forms as values where needed
        document.querySelector("#accountEdit1 .firstNameInput").value = responsePayload.firstname;
        document.querySelector("#accountEdit1 .lastNameInput").value = responsePayload.lastname;
        document.querySelector("#accountEdit1 .addressInput").value = responsePayload.address;
        document.querySelector("#accountEdit1 .paymentTypeInput").value = responsePayload.paymentType;
        document.querySelector("#accountEdit1 .displayEmailInput").value = responsePayload.email;

        // Put the hidden email field into both forms
        var hiddenEmailInputs = document.querySelectorAll("input.hiddenEmailInput");
        for(var i = 0; i < hiddenEmailInputs.length; i++){
            hiddenEmailInputs[i].value = responsePayload.email;
        }

      } else {
        // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }
};


// Load the dashboard page specifically
app.loadMenuPage = function(){

  // Get the email from the current token, or log the user out if none is there
  var email = typeof(app.config.sessionToken.email) == 'string' ? app.config.sessionToken.email : false;
  if(email){

    // Fetch the user data
    var queryStringObject = {
      'email' : email
    };
    app.client.request(undefined,'api/menus','GET',queryStringObject,undefined,function(menuStatusCode,menuResponsePayload){
      if(menuStatusCode == 200){

          // Get the menu object
          var menusObject = menuResponsePayload;
          app.client.request(undefined,'api/carts','GET',queryStringObject,undefined,function(cartStatusCode,cartResponsePayload){
            // Get the cart object
            var cartsObject = cartResponsePayload;
            // Create new cart object
            var newCartObject = {}
            newCartObject.email = email;
            // Create cart array
            var newCartMenuArray = []
            // Fetch each menus
            menusObject.items.forEach(function(menu){
              // Set quantity default is 0
              var quantity = 0;
              //  If have this menu, get quantity / if not, quantity will be 0
              if(cartStatusCode == 200){
                cartsObject.menus.forEach(function(cartItem){
                  if(menu.id == cartItem.id){
                    quantity = cartItem.quantity;
                  }
                })
              }

              // Set table detail
              var table = document.getElementById("menuTable");
              var tr = table.insertRow(-1);
              tr.classList.add('checkRow');
              var td0 = tr.insertCell(0);
              var td1 = tr.insertCell(1);
              var td2 = tr.insertCell(2);
              var td3 = tr.insertCell(3);
              var td4 = tr.insertCell(4);
              var td5 = tr.insertCell(5);
              var img = "<img src='"+menu.img+"' style='width:400px;'>";
              // Create input quantity for each menu
              var qt = "<input class='quantityInput' type='number' name='"+menu.id+"' value="+quantity+" style='text-align:center' min='0' step='1'>";
              td0.innerHTML = img;
              td1.innerHTML = menu.name;
              td2.innerHTML = menu.description;
              td3.innerHTML = menu.type;
              td4.innerHTML = menu.price;
              td5.innerHTML = qt;

              // Put id and quantity into cart array
              newCartMenuArray.push({
                "id": menu.id,
                "quantity": quantity
              })
            })
            var q = document.getElementsByClassName("quantityInput");
            for (let i = 0; i < q.length; i++) {
              // Each quantity input add event listener click
              q[i].addEventListener('change',function(){
                var quantityInputName = this.name
                var quantityInputValue = this.value
                // If not integer or less than 0 , set to 0
                if(quantityInputValue% 1 != 0){
                  quantityInputValue = 0;
                  alert('only integer');
                } if(quantityInputValue < 0){
                  quantityInputValue = 0;
                  this.value = 0;
                  alert('must greater or equal than 0');
                }

                // After quantity change, cart array quantity will change too
                newCartMenuArray.forEach(function(newCartMenu){
                  if(newCartMenu.id == quantityInputName){
                    newCartMenu.quantity = parseInt(quantityInputValue);
                  }
                })
              })
            }
            // After confirm order ,  set cart array into new cart object and send to carts api
            document.getElementById('confirmOrder').addEventListener('click', function(){
              newCartObject.menuSelects = newCartMenuArray;
              app.client.request(undefined,'api/carts','POST',undefined,newCartObject,function(confirmStatusCode,confirmResponsePayload){
                if(confirmStatusCode == 200){
                  window.location = 'cart';
                } else {
                  app.logUserOut();
                }
              })
            })
          })
        }
      })
    } else {
      // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
      app.logUserOut();
    }
};

app.loadCartPage = function(){

  // Get the email from the current token, or log the user out if none is there
  var email = typeof(app.config.sessionToken.email) == 'string' ? app.config.sessionToken.email : false;
  if(email){

    // Fetch the user data
    var queryStringObject = {
      'email' : email
    };

    // Load data from cart api
    app.client.request(undefined,'api/carts','GET',queryStringObject,undefined,function(statusCode,responsePayload){
      // Fetch into table and sum for total price
      var totalPrice = 0;
      responsePayload.menus.forEach(function(list){
        var table = document.getElementById("cartTable");
        var tr = table.insertRow(-1);
        tr.classList.add('checkRow');
        var td0 = tr.insertCell(0);
        var td1 = tr.insertCell(1);
        var td2 = tr.insertCell(2);
        var td3 = tr.insertCell(3);
        td0.innerHTML = list.name;
        td1.innerHTML = list.price;
        td2.innerHTML = list.quantity;
        td3.innerHTML = list.calPrice;
        totalPrice += list.calPrice;
      })
      document.getElementById('totalPrice').innerHTML = "total: " + totalPrice;
      // Set the payload
      var payload = {
        email: email,
        totalPrice: totalPrice
      }

      // Receive payment type from user api
      app.client.request(undefined,'api/users','GET',queryStringObject,undefined,function(userStatusCode,userResponsePayload){
        payload.paymentBrand = userResponsePayload.paymentType;
      })
      
      // When click, send into order api
      document.getElementById('finalOrder').addEventListener('click', function(){
        if (totalPrice==0){
          alert('please select your order');
          window.location = 'menus';
        } else {
          app.client.request(undefined,'api/orders','POST',undefined,payload,function(orderStatusCode,orderResponsePayload){
            if(orderStatusCode == 200){
              alert('success');
            }
            window.location = '';
          })
        }
      })
    })
  } else {
    // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
    app.logUserOut();
  }
}

// Loop to renew token often
app.tokenRenewalLoop = function(){
  setInterval(function(){
    app.renewToken(function(err){
      if(!err){
        console.log("Token renewed successfully @ "+Date.now());
      }
    });
  },1000 * 60);
};

// Init (bootstrapping)
app.init = function(){

  // Bind all form submissions
  app.bindForms();

  // Bind logout logout button
  app.bindLogoutButton();

  // Get the token from localstorage
  app.getSessionToken();

  // Renew token
  app.tokenRenewalLoop();

  // Load data on page
  app.loadDataOnPage();

};

// Call the init processes after the window loads
window.onload = function(){
  app.init();
};
