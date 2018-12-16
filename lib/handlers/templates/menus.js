/*
 * Menu template Handlers
 *
 */

// Dependencies
var helpers = require('../../helpers');

// Create a new check
var template = function(data,callback){
  // Reject any request that isn't a GET
  if(data.method == 'get'){
    // Prepare data for interpolation
    var templateData = {
      'head.title' : 'Choose your menu',
      'body.class' : 'menusList'
    };
    // Read in a template as a string
    helpers.getTemplate('menu',templateData,function(err,str){
      if(!err && str){
        // Add the universal header and footer
        helpers.addUniversalTemplates(str,templateData,function(err,str){
          if(!err && str){
            // Return that page as HTML
            callback(200,str,'html');
          } else {
            callback(500,undefined,'html');
          }
        });
      } else {
        callback(500,undefined,'html');
      }
    });
  } else {
    callback(405,undefined,'html');
  }
};
// Export the module
module.exports = template;
