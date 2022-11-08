
var userDetails = {

  email: null,
  id: null,
  name: null,
  username: null
}
var channelDetails = {

  connectUri: null,
  id: null,
  expires: null
}
const getConversationsResponse = {

  entities: null,
  total: null
}
var conversationDetails = {

  participant: null,
  participant2: null,
  conversationId: null
}

if (document.readyState === "complete") {
  // Fully loaded!


} else if (document.readyState === "interactive") {
  // DOM ready! Images, frames, and other subresources are still downloading.
} else {
  // Loading still in progress.
  // To wait for it to complete, add "DOMContentLoaded" or "load" listeners.

  window.addEventListener("DOMContentLoaded", () => {
      // DOM ready! Images, frames, and other subresources are still downloading.

  });

  window.addEventListener("load", () => {
      // Fully loaded!

      createChannel();
  });
}
// Obtain a reference to the platformClient object
const platformClient = require('platformClient');

// Implicit grant credentials
const CLIENT_ID = '695444f5-2adf-4bff-a188-e0a19573d89b'; ///'202478fd-e993-4321-ba71-f4815e9a1503';

// Genesys Cloud environment
const ENVIRONMENT = 'mypurecloud.com';

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\#&]" + name + "=([^&#]*)"),
  results = regex.exec(location.hash);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

if (window.location.hash) {
  console.log(location.hash);
  token = getParameterByName('access_token');

  $.ajax({
      url: `https://api.${ENVIRONMENT}/api/v2/users/me`,
      type: "GET",
      beforeSend: function (xhr) {
          xhr.setRequestHeader('Authorization', 'bearer ' + token);
      },
      success: function (result, status, xhr) {

          const obj = JSON.parse(JSON.stringify(result));

          userDetails.email = obj.email;
          userDetails.id = obj.id;
          userDetails.name = obj.name;
          userDetails.username = obj.username;

      }
  });

  location.hash = ''

} else {
  var queryStringData = {
      response_type: "token",
      client_id: CLIENT_ID,
      redirect_uri: "https://stoltenbergpeter.github.io/groupActivation/agentgreeting.html"
  }
  window.localStorage.clear();

  console.log(`https://login.${ENVIRONMENT}/oauth/authorize?` + jQuery.param(queryStringData));
  window.location.replace(`https://login.${ENVIRONMENT}/oauth/authorize?` + jQuery.param(queryStringData));
}

function reAuth() {

  var queryStringData = {
      response_type: "token",
      client_id: CLIENT_ID,
      redirect_uri: "https://stoltenbergpeter.github.io/groupActivation/agentgreeting.html"
  }
  window.localStorage.clear();

  window.location.replace(`https://login.${ENVIRONMENT}/oauth/authorize?` + jQuery.param(queryStringData));
}
function executeworkflow() {
        $.ajax({
            url: `https://api.${ENVIRONMENT}/api/v2/flows/executions`, 
            type: "POST",
            contentType: 'application/json',
            data: JSON.stringify({
                "flowId": "67230dc0-5838-450e-9b58-845e61e15949"
            }),
            dataType: 'json',
            async: true,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'bearer ' + token);
            },
            success: function (result, status, xhr) {
                console.log(result);
  
                const obj = JSON.parse(JSON.stringify(result));
  
  
            },
            error: function (result, status, xhr) {
                console.log(result);
                var obj = JSON.parse(JSON.stringify(result));
                console.log(obj);
                console.log(status);
                //reAuth();
  
            }
        });
    }

function createChannel() {
  $.ajax({
      url: `https://api.${ENVIRONMENT}/api/v2/notifications/channels`,
      type: "POST",
      async: true,
      beforeSend: function (xhr) {
          xhr.setRequestHeader('Authorization', 'bearer ' + token);
      },
      success: function (result, status, xhr) {
          console.log(result);

          const obj = JSON.parse(JSON.stringify(result));
          channelDetails.connectUri = obj.connectUri;
          channelDetails.id = obj.id;

          try {
              getUserPresence(userDetails.id);
          } catch (error) {
              console.log("error in catch createChannel(), reauth!");

              reAuth();
          }

      },
      error: function (result, status, xhr) {
          console.log(result);
          console.log(status);
          reAuth();

      }
  });
}
function getUserPresence(userId) {

  if (userDetails.id == null) {
      console.log("No user id found, reauth");
      reAuth();
  } else {
      $.ajax({
          url: `https://api.${ENVIRONMENT}` + "/api/v2/users/" + userId + "/presences/purecloud",
          type: "GET",
          contentType: 'application/json',
          dataType: 'json',
          async: true,
          beforeSend: function (xhr) {
              xhr.setRequestHeader('Authorization', 'bearer ' + token);
          },
          success: function (result, status, xhr) {
              console.log(result);
              const obj = JSON.parse(JSON.stringify(result));
              var presence = obj.presenceDefinition.systemPresence;
              console.log(presence);
              if (presence == "OFFLINE" || presence == "Offline") {
                  setTimeout(function () {
                      getUserPresence(userId)
                  }, 5000);
              } else {
                  console.log("Start userConversationListener");
                  //addUserConversationListener(channelDetails.id);
              }

          },
          error: function (result, status, xhr) {
              console.log(result);
              console.log(status);
              reAuth();

          }
      });
  }
}
