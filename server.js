//My userid= 4dfa58eca3f7514a2c02f9e0

var auth = "auth+live+7b0f6937a1bee032dea90f584c45195a84bd2512";
var botid = "50b7e7e7aaa5cd204cce4337";
//var altnation = "4ed59c3e14169c686e41eb9a";
var altnation = "4e77b38014169c322d7bcf47";
var myid = "4dfa58eca3f7514a2c02f9e0";

var Bot = require('ttapi');
/*var bot = new Bot(auth, botid, altnation);

bot.on('ready', function() {
    console.log("ready");
    bot.roomRegister(altnation, function() {
        console.log("registered");
    })
});*/

var bot = new Bot(auth, botid, altnation);

bot.on('speak', function (data) {
  // Respond to "/hello" command
  if (data.text.match(/^\/hello$/)) {
    bot.speak('Hey! How are you @'+data.name+' ?');
  }
});