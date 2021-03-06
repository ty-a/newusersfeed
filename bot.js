var config = require("./config.json");
var irc = require("irc");
var fs = require("fs");

var outChannel = "#cvn-wikia-newusers";
var wikianet = new irc.Client(
  config.sourceirchost,
  config.sourceNick,
  {
    channels:[
      "#user-registration"
    ],
    retryCount: 15,
    userName: "tybot",
    realName: config.realname,
    debug:true,
    autoConnect: true,
    stripColors: true,
    port:config.sourceircport
  }
);

var freenode = new irc.Client(
  config.commandirchost,
  config.commandnick,
  {
    channels: [
      outChannel
    ],
    sasl: false,
    retryCount: 15,
    userName: "tybot",
    realName: config.realname,
    password: config.nickservpass,
    debug: true,
    autoConnect: true
  }
);

wikianet.addListener("error", function(message) {
  console.error("ERROR: %s: %s", message.command, message.args.join(" "));
});

freenode.addListener("error", function(message) {
  console.error("ERROR: %s: %s", message.command, message.args.join(" "));
});

freenode.addListener("message", function(nick, to, text, message) {
  if(!text.startsWith(config.trigger)) {
    return;
  }

  // only users with vstf cloaks can use commands
  if(!message.host.startsWith("wikia/vstf/")) {
    return;
  }

  const args = text.slice(config.trigger.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  var lang;

  switch(command) {
    // commands are die and reconnect
  case "die":
    // does the library actually send the message like the docs say?
    freenode.disconnect("My death was requested by " + nick);
    wikianet.disconnect("My death was requested by " + nick);
    process.exit();
    break;
  case "reconnect":
    freenode.say(to,"Reconnecting to source feed!");
    wikianet.disconnect("My restart was requested by " + nick);
    setTimeout(function() {
      wikianet.connect();
    }, 3000); // wait 3 seconds before reconnect
    freenode.say(to,"Should be reconnected :)");

    break;
  }
  //console.log(message);
});

wikianet.addListener("message", function(nick, to, text, message) {
  if(!nick.startsWith("registrations")) {
    return;
  }
  var user;
  var wiki;
  [user, wiki] = text.split(" New user registration ");
  var end;
  var isUsingFandom = false;
  if(wiki.indexOf(".wikia") == -1) {
    // grab the /wiki/ so that we can get the langcode as well
    end = wiki.indexOf("/wiki/");
    isUsingFandom = true;
    // [10:41:42] <registrations> DrewMan336 New user registration http://fairytail.fandom.com/ru/wiki/Special:Log/newusers

  } else {
    end = wiki.indexOf(".wikia")
  }

  wiki = wiki.substring(
    wiki.indexOf("://") + 3,
    end
  );

  var out = irc.colors.wrap("dark_green", user);
  out += " New user registration ";
  if(isUsingFandom) {
    out += irc.colors.wrap("cyan", "https://" + wiki + "/wiki/Special:Log/newusers - https://" + wiki + "/wiki/Special:Contributions/" + encodeURIComponent(user));
  } else {
    out += irc.colors.wrap("cyan", "https://" + wiki + ".wikia.com/wiki/Special:Log/newusers - https://" + wiki + ".wikia.com/wiki/Special:Contributions/" + encodeURIComponent(user));
  }

  freenode.say(outChannel, out);

});
