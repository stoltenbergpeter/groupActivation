
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
                    addUserConversationListener(channelDetails.id);
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
function addUserConversationListener(channel) {
    var userConversationsTopic = "v2.users." + userDetails.id + ".conversations";

    if (userDetails.id == null) {
        addUserConversationListener(channel);
    } else {
        $.ajax({
            url: `https://api.${ENVIRONMENT}/api/v2/notifications/channels/` + channel + "/subscriptions",
            type: "POST",
            contentType: 'application/json',
            data: JSON.stringify([{
                        "id": userConversationsTopic
                    }
                ]),
            dataType: 'json',
            async: true,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'bearer ' + token);
            },
            success: function (result, status, xhr) {
                console.log(result);

                const obj = JSON.parse(JSON.stringify(result));
                conversationListener(userConversationsTopic);

            },
            error: function (result, status, xhr) {
                console.log(result);

                var obj = JSON.parse(JSON.stringify(result));
                console.log(obj);
                console.log(status);
                reAuth();

            }
        });
    }
}

function conversationListener(userConversationsTopic) {

    // Create WebSocket connection.
    const socket = new WebSocket(channelDetails.connectUri);

    // Listen for messages
    socket.addEventListener('message', function (event) {
        console.log('Message from server ', event.data);

        const notification = JSON.parse(event.data);

        var event = notification.eventBody;
        console.log(event);

        // Discard unwanted notifications
        if (notification.topicName.toLowerCase() === 'channel.metadata') {
            // Heartbeat
            console.info('Ignoring metadata: ', notification);
            return;
        } else if (notification.topicName.toLowerCase() !== userConversationsTopic.toLowerCase()) {
            // Unexpected topic
            console.warn('Unknown notification: ', notification);
            return;
        } else {
            console.debug('Conversation notification: ', notification);
        }



		if(notification.eventBody.participants.filter(participant => participant.purpose === "agent").length > 0) {
			console.log("agent");
            console.log(notification.eventBody.participants.filter(participant => participant.purpose === "agent"));
            console.log(notification.eventBody.participants.filter(participant => participant.purpose === "customer"));

			startGreetingForAgent(notification);
        	} 
		 else  {
			console.log("This is not an ACD call and should be processed as group/user");

			console.log(notification.eventBody.participants.filter(participant => participant.purpose === "group"));
            console.log(notification.eventBody.participants.filter(participant => participant.purpose === "user"));
			
			if(notification.eventBody.participants.filter(participant => participant.purpose === "group").length > 0) {
			console.log("group");



 			var userLength = notification.eventBody.participants.filter(participant => participant.purpose === "user").length 
			console.log("group array length:",userLength);
          	for (let i = 0; i < userLength; i++) {


			console.log("My user id: ", userDetails.id);
			console.log("Returned user id:", notification.eventBody.participants.filter(participant => participant.purpose === "user")[i].userId);
			
			if(notification.eventBody.participants.filter(participant => participant.purpose === "user")[i].userId == userDetails.id) {
			startGreetingForGroup(notification);
			} 
			else {
				console.log("Event data user id does not match current user id");
			}

			}

			}
			else {
			console.log("user");

			startGreetingForUser(notification);

			}
		 }
    });
}


function startGreetingForGroup(notification) {

	setParticipantData(notification.eventBody.id, notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].id,"group",userDetails.username);

	var userLength = notification.eventBody.participants.filter(participant => participant.purpose === "user").length 

    	for (let i = 0; i < userLength; i++) {
	
			if(notification.eventBody.participants.filter(participant => participant.purpose === "user")[i].userId == userDetails.id) {


				 if (notification.eventBody.participants.filter(participant => participant.purpose === "user")[i].calls[0].state === "connected" && notification.eventBody.participants.filter(participant => participant.purpose === "user")[i].userId == userDetails.id && notification.eventBody.participants.filter(participant => participant.purpose === "user")[i].calls[0].direction == "inbound") {

            if (window.localStorage.getItem(notification.eventBody.id && notification.eventBody.participants.filter(participant => participant.purpose === "user")[i].calls[0].state === "connected") == notification.eventBody.id) {

                console.log("Already Played for:", notification.eventBody.id);

            }
           
            else {
                if (window.localStorage.getItem(notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].id) == "customerPlayed") {
                    console.log("Already Played for:", notification.eventBody.id);
                }
                else {
                

                    setTimeout(function () {
                        addParticipantToCall(notification.eventBody.id, notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].id, "Play_Agent_Greeting_App@localhost");
                    }, 500);
                }
                    
                }
        }

			}
			else {
				console.log("Event data user id does not match current user id");
			}

		}

}





function startGreetingForUser(notification) {

	setParticipantData(notification.eventBody.id, notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].id,"user",userDetails.username);


	 
        try {
        if (notification.eventBody.participants.filter(participant => participant.purpose === "user")[0].calls[0].state === "connected" && notification.eventBody.participants.filter(participant => participant.purpose === "user")[0].userId == userDetails.id && notification.eventBody.participants.filter(participant => participant.purpose === "user")[0].calls[0].direction == "inbound") {
            console.info("participant.id: ", notification.eventBody.participants.filter(participant => participant.purpose === "user")[0].id && notification.eventBody.participants.filter(participant => participant.purpose === "user")[0].calls[0].direction == "inbound");
            console.log(notification.eventBody.participants.filter(participant => participant.purpose === "user")[0].calls[0].state);

            if (window.localStorage.getItem(notification.eventBody.id && notification.eventBody.participants.filter(participant => participant.purpose === "user")[0].calls[0].state === "connected") == notification.eventBody.id) {

                console.log("Already Played for:", notification.eventBody.id);

            }
           
            else {
                if (window.localStorage.getItem(notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].id) == "customerPlayed") {
                    console.log("Already Played for:", notification.eventBody.id);
                }
                else {
                

                    setTimeout(function () {
                        addParticipantToCall(notification.eventBody.id, notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].id, "Play_Agent_Greeting_App@localhost");
                    }, 500);
                }
                    
                }
        }
       else if (notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].attributes.AgentEmailPrompt && notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].calls[0].direction == "inbound") { /// previous agent already played

           console.log("Identified an existing customer");
           console.log("Consult Participant ID:",notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].consultParticipantId);
           var agents = notification.eventBody.participants.filter(participant => participant.purpose === "user");

           var length = notification.eventBody.participants.filter(participant => participant.purpose === "user").length;

           for (let i = 0; i < length; i++) {

               if (agents[i].calls[0].state == "connected" && agents[i].userId == userDetails.id) {
                       if (notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].consultParticipantId) {

                           console.log("Consult Transfer:", notification.eventBody.id);
                           console.log("Do not play");
                           window.localStorage.setItem(notification.eventBody.id, notification.eventBody.id);
                           window.localStorage.setItem(notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].id, "customerPlayed");

                       }
                       else {

                           if (window.localStorage.getItem(notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].id) == "customerPlayed") {
                               console.log("Already Played for:", notification.eventBody.id);
                           }
                           else {
                            
                               setTimeout(function () {
                                   addParticipantToCall(notification.eventBody.id, notification.eventBody.participants.filter(participant => participant.purpose === "external")[0].id, "Play_Agent_Greeting_App@localhost");
                               }, 500);
                           }
                       }
               }
           }
       }
  }
  catch {
        console.log("Do not play");
        window.localStorage.setItem(notification.eventBody.id, notification.eventBody.id);

  }

}
function startGreetingForAgent(notification) {
	setParticipantData(notification.eventBody.id, notification.eventBody.participants.filter(participant => participant.purpose === "customer")[0].id,"agent",userDetails.username);

        try {
        if (notification.eventBody.participants.filter(participant => participant.purpose === "agent")[0].calls[0].state === "connected" && notification.eventBody.participants.filter(participant => participant.purpose === "agent")[0].userId == userDetails.id && notification.eventBody.participants.filter(participant => participant.purpose === "agent")[0].calls[0].direction == "inbound") {
            console.info("participant.id: ", notification.eventBody.participants.filter(participant => participant.purpose === "agent")[0].id && notification.eventBody.participants.filter(participant => participant.purpose === "agent")[0].calls[0].direction == "inbound");
            console.log(notification.eventBody.participants.filter(participant => participant.purpose === "agent")[0].calls[0].state);

            if (window.localStorage.getItem(notification.eventBody.id && notification.eventBody.participants.filter(participant => participant.purpose === "agent")[0].calls[0].state === "connected") == notification.eventBody.id) {

                console.log("Already Played for:", notification.eventBody.id);

            }
           
            else {
                if (window.localStorage.getItem(notification.eventBody.participants.filter(participant => participant.purpose === "customer")[0].id) == "customerPlayed") {
                    console.log("Already Played for:", notification.eventBody.id);
                }
                else {
                    setTimeout(function () {
                        addParticipantToCall(notification.eventBody.id, notification.eventBody.participants.filter(participant => participant.purpose === "customer")[0].id, "Play_Agent_Greeting_App@localhost");
                    }, 500);
                }
                    
                }
        }
       else if (notification.eventBody.participants.filter(participant => participant.purpose === "customer")[0].attributes.AgentEmailPrompt && notification.eventBody.participants.filter(participant => participant.purpose === "customer")[0].calls[0].direction == "inbound") { /// previous agent already played

           console.log("Identified an existing customer");
           console.log("Consult Participant ID:",notification.eventBody.participants.filter(participant => participant.purpose === "customer")[0].consultParticipantId);
           var agents = notification.eventBody.participants.filter(participant => participant.purpose === "agent");

           var length = notification.eventBody.participants.filter(participant => participant.purpose === "agent").length;
           for (let i = 0; i < length; i++) {
               if (agents[i].calls[0].state == "connected" && agents[i].userId == userDetails.id) {
                       if (notification.eventBody.participants.filter(participant => participant.purpose === "customer")[0].consultParticipantId) {

                           console.log("Consult Transfer:", notification.eventBody.id);
                           console.log("Do not play");
                           window.localStorage.setItem(notification.eventBody.id, notification.eventBody.id);
                           window.localStorage.setItem(notification.eventBody.participants.filter(participant => participant.purpose === "customer")[0].id, "customerPlayed");

                       }
                       else {

                           if (window.localStorage.getItem(notification.eventBody.participants.filter(participant => participant.purpose === "customer")[0].id) == "customerPlayed") {
                               console.log("Already Played for:", notification.eventBody.id);
                           }
                           else {
                               setTimeout(function () {
                                   addParticipantToCall(notification.eventBody.id, notification.eventBody.participants.filter(participant => participant.purpose === "customer")[0].id, "Play_Agent_Greeting_App@localhost");
                               }, 500);
                           }  
                       }
               }
           }
       }
  }
  catch {
        console.log("Do not play");
        window.localStorage.setItem(notification.eventBody.id, notification.eventBody.id);
  }
}


function addParticipantToCall(id, participant, destination) {

    if (window.localStorage.getItem(participant) == "customerPlayed" || window.localStorage.getItem(id)) {
        console.log("Already Played for:", id);
    } else {
                window.localStorage.setItem(id, id);
                window.localStorage.setItem(participant, "customerPlayed");
        $.ajax({
            url: `https://api.${ENVIRONMENT}/api/v2/conversations/calls/` + id + '/participants/' + participant + '/consult',
            type: "POST",
            contentType: 'application/json',
            data: JSON.stringify({
                "speakTo": "BOTH",
                "destination": {
                    "address": destination,
                    "name": "Agent Greeting"
                }
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
}

function setParticipantData(id, participant,purpose,username) {
    if (window.localStorage.getItem(participant + "_data")) {
    } else {
        window.localStorage.setItem(participant + "_data", participant + "_data");

        $.ajax({
            url: `https://api.${ENVIRONMENT}/api/v2/conversations/calls/` + id + '/participants/' + participant + '/attributes',
            type: "PATCH",
            contentType: 'application/json',
            data: JSON.stringify({
                "attributes": {

                    "purpose": purpose,
					"AgentUsername": username
                }
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
}


function removeSubscriptions(channel) { {
        $.ajax({
            url: `https://api.${ENVIRONMENT}/api/v2/notifications/channels/` + channel + "/subscriptions",
            type: "DELETE",
            dataType: 'json',
            async: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'bearer ' + token);
            },
            success: function (result, status, xhr) {
                console.log(result);

                const obj = JSON.parse(JSON.stringify(result));
                conversationListener();

            },
            error: function (result, status, xhr) {
                console.log(result);
                var obj = JSON.parse(JSON.stringify(result));
                console.log(obj);
                console.log(status);
                reAuth();

            }
        });
    }
}
