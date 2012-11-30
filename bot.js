var Bot = require('ttapi');
var db = require('./db.js');

var commandMap = {
	"+queue": "addToQueue",
	"add to queue": "addToQueue",
	"add": "addToQueue",
	"+": "addToQueue",
	"+q": "addToQueue",
	"dj": "addToQueue",
	"+dj": "addToQueue",
	"help": "tellCommands",
	"commands": "tellCommands",
	"alias": "tellAlias",
	"song": "tellSongInfo",
	"songinfo": "tellSongInfo"
};

var commandDescs = {
	"addToQueue" : {
		base: "+queue",
		alt: ["add to queue", "add", "+", "+q", "dj", "+dj"],
		desc: "Add yourself to the DJ queue"
	},
	"tellCommands": {
		base: "help",
		alt: ["commands"],
		desc: "Show bot help"
	},
	"tellAlias": {
		base: "alias",
		alt: [],
		desc: "Show the aliases of a command"
	},
	tellSongInfo: {
		base: "song",
		alt: ["songinfo"],
		desc: "songinfo <song name> ~ Tells you the history of that song in this room"
	}
};


/******** INIT BOT OBJECT **********/

function RoomBot(botid, authid, roomid) {

	//Config Vars
	this.botId = botid;
	this.roomId = roomid;

	this.djs = {};
	this.queue = [];

	//Build Bot
	this.bot = new Bot(authid, botid);

	var that = this;

	//Run
	this.bot.on('ready', function() { that.run(); });

}

RoomBot.prototype.run = function() {

	var bot = this.bot;

	var that  = this;

	bot.on('roomChanged', function() { that.roomChanged(); });

	bot.userInfo(function(info) {
		
		that.botName = info.name;

		bot.roomRegister(that.roomId);
	});


};

RoomBot.prototype.roomChanged = function() {

	var bot = this.bot;

	var that = this;

	bot.roomInfo(function(info) {

		that.maxDJs = info.room.metadata.max_djs;
		that.roomName = info.room.name;
		this.isBotDJ = false;
		this.currentSong = {
			title: "",
			artist: "",
			id: 0
		}

		for(var i=0,max=info.room.metadata.djs.length; i<max; i++) {
			that.onAddDJ(info.room.metadata.djs[i], false);
		}

		if(info.room.metadata.moderator_id.indexOf(that.botId) === -1) {
			that.askForModerator();
		}

		bot.on('add_dj', function(dj) { that.onAddDJ(dj.user[0].userid); });
		bot.on('rem_dj', function(dj) { that.onRemoveDJ(dj.user[0].userid); });
		bot.on('endsong', function(song) { that.songPlayed(song); });
		bot.on('newsong', function(song) { that.songStarted(song); });
		bot.on('pmmed', function(pm) { that.parseCommand(pm.senderid, pm.text); })
		bot.on('speak', function(chatter) { that.checkChatter(chatter.userid, chatter.text); });
		bot.on('registered', function(user) { that.someoneEntered(user); });
		bot.on('update_votes', function(vote) { that.onVote(vote); })

		that.tryDJing();

		console.log("Bot Watching Room!");

	});

};

/******** COMMANDS **********/

RoomBot.prototype.parseCommand = function(userid, msg) {
	trimmed = msg.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	var chosenCommLength = 0;
	var chosenFunc = false;
	var chosenPos = "";

	for(comm in commandMap) {
		var command = commandMap[comm];

		if(trimmed.toLowerCase().indexOf(comm) !== -1 && comm.length > chosenCommLength) {
			chosenCommLength = comm.length;
			chosenFunc = command;
			chosenPos = trimmed.toLowerCase().indexOf(comm);
		}
	}

	if(trimmed.toLowerCase().indexOf('alias') !== -1) {
		chosenCommLength = 5;
		chosenFunc = commandMap['alias'];
		chosenPos = trimmed.toLowerCase().indexOf('alias');
	}

	if(trimmed.toLowerCase().indexOf('help') !== -1) {
		chosenCommLength = 4;
		chosenFunc = commandMap['help'];
		chosenPos = trimmed.toLowerCase().indexOf('help');
	}

	if(chosenFunc) {
		var args = trimmed.substring(0, chosenPos) + trimmed.substring(chosenPos + chosenCommLength);

		args = args.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

		this[chosenFunc](userid, args);
	}
}

RoomBot.prototype.checkChatter = function(userid, chatter) {
	if(chatter.indexOf(this.botName) !== -1) {
		this.parseCommand(userid, chatter.replace("@"+this.botName, "").replace(this.botName, ""));
	}
}

RoomBot.prototype.tellSongInfo = function(user, args) {
	var bot = this.bot;
	var that = this;

	if(args !== "") {
		db.songs.get(args, function(songs) {
			if(songs.length === 0) {
				bot.pm("That song has never been played in this room!", user);
			} else {
				for(var i=0,max=songs.length; i<max; i++) {
					var song = songs[i];

					bot.pm(song.title+" by "+song.artist+" has been played in this room "+song.playCount+" times.  It's gotten "+song.awesomes+" awesomes and "+song.lames+" lames", user);
				}
			}
		});
	} else {
		bot.pm("What song do you want the info for?", user);
	}

}

RoomBot.prototype.tellCommands = function(user, args) {
	var bot = this.bot;
	var that = this;

	args = args.toLowerCase();

	if(args === "") {
		var comms = []

		for(comm in commandDescs) {
			comms.push(commandDescs[comm].base);
		}

		bot.pm("Type `help <command>` for details ---- Commands: " + comms.join(", "), user);
	} else {
		if(typeof(commandMap[args]) !== "undefined" && typeof(commandDescs[commandMap[args]]) !== "undefined") {
			bot.pm(args+": "+commandDescs[commandMap[args]].desc, user);
		} else {
			bot.pm("That command doesn't exist!", user)
		}
	}
}

RoomBot.prototype.tellAlias = function(user, args) {

	var bot = this.bot;
	var that = this;

	args = args.toLowerCase();

	if(args !== "") {
		if(typeof(commandMap[args]) !== "undefined" && typeof(commandDescs[commandMap[args]]) !== "undefined") {
			bot.pm(commandDescs[commandMap[args]].alt.join(", "), user);
		} else {
			bot.pm("That command doesn't exist!", user)
		}
	} else {
		bot.pm("What command do you want to know the aliases of?", user);
	}
}

/******** GENERIC EVENT HANDLERS ********/

RoomBot.prototype.someoneEntered = function(user) {
	var bot = this.bot;
	var that = this;

	if(Object.keys(this.djs).length >= this.maxDJs) {
		bot.speak("Hey, @"+user.user[0].name+", looks like the stage is full, but if you tell me +queue I'll add you to the list!");
	} else {
		bot.speak("Hey, @"+user.user[0].name+", feel free to jump on stage, or join the queue by telling me +queue");
	}
};

RoomBot.prototype.onVote = function(vote) {
	var bot = this.bot;
	var that = this;


	if(vote.room.metadata.votelog[0][1] === 'up') {
		db.songs.awesome(this.currentSong);

		if(vote.room.metadata.upvotes == 10) {
			bot.speak("Great song!");
			bot.bop();
			bot.snag(function() {
				bot.playlistAdd(that.currentSong.id);
			});

		}
	} else {
		db.songs.lame(this.currentSong);
	}
}

RoomBot.prototype.songStarted = function(song) {
	if(this.isBotDJ) {
		this.bot.bop();
	}

	db.songs.songPlayed({title: song.room.metadata.current_song.metadata.song, artist: song.room.metadata.current_song.metadata.artist});

	this.currentSong = {
		title: song.room.metadata.current_song.metadata.song,
		artist: song.room.metadata.current_song.metadata.artist,
		id: song.room.metadata.current_song._id
	};
}

RoomBot.prototype.songPlayed = function(song) {
	console.log("Song ended");
	if(typeof(this.djs[song.room.metadata.userid]) !== "undefined") {
		this.djs[song.room.metadata.userid].songsPlayed++;

		if(this.djs[song.room.metadata.userid].songsPlayed >= this.maxSongs && Object.keys(this.djs).length + this.queue.length >= this.maxDJs) {
			this.askToStepDown(song.room.metadata.userid);
		}
	}

};

RoomBot.prototype.onAddDJ = function(id, addBot) {

	if(typeof(addBot) === "undefined") {
		addBot = true;
	}

	var bot = this.bot;
	var that = this;

	if(this.queue.length && this.queue[0] !== id && Object.keys(this.djs).length + this.queue.length >= this.maxDJs) {
		bot.getProfile(id, function(prof) {
			bot.speak("Hey, @" + prof.name + ", it's not your turn yet!  Join the queue and we'll get you on stage ASAP!");
			bot.remDj(id);
		});
	}

	this.queue.shift();

	this.djs[id] = {
		songsPlayed: 0
	};

	if(addBot && id !== this.botId) { 
		this.tryDJing();
	}

}

/********** ACTIONS *************/

RoomBot.prototype.askToStepDown = function(id) {
	var bot = this.bot;
	var that = this;

	bot.getProfile(id, function(prof) {
		bot.speak("@" + prof.name + ", please step down from the stage.  It's time to let someone else have a turn!");

		setTimeout(function() {
			bot.remDj(id);
		}, 5000);
	});
};

RoomBot.prototype.askForModerator = function() {

	var bot = this.bot;

	var that = this;

	bot.on('new_moderator', function(mod) {
		if(mod.userid = that.botId) {
			clearInterval(that.askForMod);
			bot.speak("Thanks!");
		}
	});

	this.askForMod = setInterval(function() {
		bot.speak("Hey, I'm a bot!  You should make me a moderator!");
	}, 10000)

};

RoomBot.prototype.addToQueue = function(id) {
	var bot = this.bot;
	var that = this;

	if(this.queue.indexOf(id) === -1) {
		this.queue.push(id);
		this.maxSongs = this.queue.length >= 4 ? 2 : 5 - this.queue.length;

		if(Object.keys(this.djs).length + this.queue.length >= this.maxDJs && this.queue.length === 1) {
			this.addDJFromQueue();
		}
	} else {
		bot.pm("You're already in the DJ queue!  Your #" + (this.queue.indexOf(id) + 1) + " in line!", id);
	}
};

RoomBot.prototype.tryDJing = function() {
	var bot = this.bot;
	var that = this;

	if(this.isBotDJ) {
		if(Object.keys(this.djs).length + this.queue.length >= 2) {
			bot.remDj(this.botId);
			this.isBotDJ = false;
		}
	} else {
		if(Object.keys(this.djs).length + this.queue.length <= 1) {
			bot.addDj();
			this.isBotDJ = true;
		}
	}

}

RoomBot.prototype.addDJFromQueue = function() {
	var bot = this.bot;
	var that = this;

	if(this.queue.length) {
		var curId = this.queue[0];

		bot.getProfile(curId, function(prof) {
			var msg = "Hey, @"+prof.name+", that spot is yours!  Jump up on stage!";
			bot.speak(msg);

			var tries = 1;

			var askToJump = setInterval(function() { 
				if(!that.queue.length || that.queue[0] !== curId) {
					clearInterval(askToJump);
					if(Object.keys(that.djs).length + that.queue.length > that.maxDJs && that.queue.length) {
						that.addDJFromQueue();
					}
				} else if(tries == 3) {
					msg = "@"+prof.name+", you there?  Hurry up - it's your turn to DJ!";
					bot.speak(msg);
					tries++;
				} else if(tries == 5) {
					msg = "@"+prof.name+", you take too long. Moving on...";
					bot.speak(msg);
					tries++;

					that.queue.shift();
					clearInterval(askToJump);
					that.addDJFromQueue();
				} else {
					bot.speak(msg);
					tries++;
				}
			}, 10000);
		});
	}
}

RoomBot.prototype.onRemoveDJ = function(id) {
	delete this.djs[id];

	this.tryDJing();
}



module.exports = exports = RoomBot