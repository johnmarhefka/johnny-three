//CONFIG===============================================

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');
var request = require('request');
var Slack = require('slack-node');  
    var apiToken = "xoxp-16377691796-49529030913-49665726773-a795028452";
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/botkit_express_demo'
var botkit_mongo_storage = require('../../config/botkit-storage-mongoose')({mongoUri: mongoUri})

if (!process.env.SLACK_ID || !process.env.SLACK_SECRET || !process.env.PORT) {
    console.log('Error: Specify SLACK_ID SLACK_SECRET and PORT in environment');
    process.exit(1);
}

var controller = Botkit.slackbot({
    storage: botkit_mongo_storage
});

exports.controller = controller

//CONNECTION FUNCTIONS=====================================================
exports.connect = function(team_config) {
    var bot = controller.spawn(team_config);
    controller.trigger('create_bot', [bot, team_config]);
}

// just a simple way to make sure we don't
// connect to the RTM twice for the same team
var _bots = {};

function trackBot(bot) {
    _bots[bot.config.token] = bot;
}

controller.on('create_bot',function(bot,team) {

    if (_bots[bot.config.token]) {
    // already online! do nothing.
        console.log("already online! do nothing.")
    }
    else {
        bot.startRTM(function(err) {

            if (!err) {
                trackBot(bot);

                console.log("RTM ok");

                controller.saveTeam(team, function(err, id) {
                    if (err) {
                        console.log("Error saving team")
                    }
                    else {
                        console.log("Team " + team.name + " saved")
                    }
                });
            }
            else{
                console.log("RTM failed");
            }

            bot.startPrivateConversation({user: team.createdBy}, function(err, convo) {
                //console.log(JSON.stringify(convo));
                if (err) {
                    console.log(err);
                } else {
                    convo.say('Hi! I\'m Johnny-Three, Human / VSTS relations');
                    convo.say('To start receiving your VSTS notifications please visit http://johnny-three.herokuapp.com/admin/' + team.id);
                }
            });

        });
    }
});

//REACTIONS TO EVENTS==========================================================

// Handle events related to the websocket connection to Slack
controller.on('rtm_open',function(bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close',function(bot) {
    console.log('** The RTM api just closed');
// you may want to attempt to re-open
});

//DIALOG ======================================================================

controller.hears('hello','direct_message',function(bot,message) {
    bot.reply(message,'Hello!');
});

controller.hears('^stop','direct_message',function(bot,message) {
    bot.reply(message,'Goodbye');
    bot.rtm.close();
});

controller.on('direct_message,mention,direct_mention',function(bot,message) {
    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function(err) {
        if (err) { console.log(err) }
        bot.reply(message,'I heard you loud and clear boss.');
    });
});

//ECHO BOT ====================================================================

// Calls a specified Slack incoming webhook.
function callIncomingWebhook(webhookId, messageText, teamName) {

  var usernameForMessage = ('Someone from the ' + teamName + ' team');
  var options = {
      url: 'https://hooks.slack.com/services/' + webhookId,
      method: 'POST',
      body: '{"username": "' + usernameForMessage + '", "text": "'+ messageText + '", "icon_emoji": ":ghost:"}'
  };

  function callback(error, response, body) {
      console.log(response.statusCode);
      console.log(body);
      if (!error && response.statusCode == 200) {
          console.log(body);
      }
  }

  request(options, callback);
}

function callIncomingWebHookSean(webhookId, messageText, userObject, teamName) {
    console.log(userObject);
    var usernameForMessage = (userObject.real_name == '' ? userObject.name : userObject.real_name);
    usernameForMessage = usernameForMessage + ' (from ' + teamName + ')';
    var options = {
        url: 'https://hooks.slack.com/services/' + webhookId,
        method: 'POST',
        body: '{"username": "' + usernameForMessage + '", "text": "'+ messageText + '", "icon_url": "' + userObject.profile.image_32 +'"}'
    };

    function callback(error, response, body) {
        console.log(response.statusCode);
        console.log(body);
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    }

    request(options, callback);
}

function incomingHookFor(channelId) {
    // channelId is TeamName.ChannelName
    var checkArray = new Array();
    //From PortalWatchers.Random to AgeOfSlacktron.Random
    checkArray['T0GB3LBPE.C0GB6ABCK'] = 'T0GB1QT2A/B1FH6FNR4/XuBY0iEHYmJPIZYZbctvYTFL';
    //From AgeOfSlacktron.Random to PortalWatchers.Random
    checkArray['T0GB1QT2A.C0GAXFS4D'] = 'T0GB1QT2A/B1FMRLKDM/1IgEh4NcOFK6Nz0PFh2eaqEF'
    return checkArray[channelId];
}

controller.hears([".+","^pattern$"],["direct_message","direct_mention","mention","ambient"],function(bot,message) {
  // do something to respond to message
  // all of the fields available in a normal Slack message object are available
  // https://api.slack.com/events/message


//SEAN

console.log('START');
console.log(message);
//This is a call to the info list for the user for the message.  We are doing the actual echoing in here
// so that we don't get screwed by async stuff
bot.api.users.info({
    user: message.user,
    token: bot.config.token
}, function(err, result) {
    if (message.subtype != 'bot_message') {
        console.log(result.user);
        callIncomingWebHookSean(incomingHookFor(message.team + '.' + message.channel), message.text, result.user, bot.team_info.name)
        //'T0GB1QT2A/B1FH6FNR4/XuBY0iEHYmJPIZYZbctvYTFL'
    }
});
console.log('END')


//END SEAN

//This is the line that echoes the statement.  The first argument is the ID for the team/channel.
//if (message.subtype != 'bot_message') {
//  callIncomingWebhook('T0GB1QT2A/B1FH6FNR4/XuBY0iEHYmJPIZYZbctvYTFL', message.text, bot.team_info.name);
//}

  //bot.reply(message,'You have been echoed!');
});

function getSpeaker(bot, userid) {

}

//END ECHO BOT

controller.storage.teams.all(function(err,teams) {

    console.log(teams)

    if (err) {
        throw new Error(err);
    }

// connect all teams with bots up to slack!
    for (var t  in teams) {
        if (teams[t].bot) {
            var bot = controller.spawn(teams[t]).startRTM(function(err) {
                if (err) {
                    console.log('Error connecting bot to Slack:',err);
                } else {
                    trackBot(bot);
                }
            });
        }
    }

});
