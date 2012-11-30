var mongoose = require('mongoose');
var schema = mongoose.Schema;

mongoose.connect("mongodb://localhost/turntableBot");

var songsModel = new schema({
	title: String,
	artist: String,
	playCount: {type: Number, default: 0},
	awesomes: {type: Number, default: 0},
	lames: {type: Number, default: 0}
});

var songsDb = mongoose.model("Songs", songsModel);

function Songs() {}

Songs.prototype.songPlayed = function(song) {
	if(typeof(song.title) === "undefined" || typeof(song.artist) === "undefined") {
		throw new Error("Title and Artist must be defined");
	}

	songsDb.findOne({title: song.title, artist: song.artist}, function(err, dbSong) {
		if(err) {
			throw new Error(err);
		}

		if(dbSong === null) {
			var newSong = new songsDb({
				title: song.title,
				artist: song.artist,
				playCount: 1
			});

			newSong.save();
		} else {
			dbSong.playCount++;

			dbSong.save();
		}
	});
}

Songs.prototype.awesome = function(song) {
	songsDb.findOne({title: song.title, artist: song.artist}, function(err, dbSong) {
		if(err) {
			throw new Error(err);
		}

		if(dbSong !== null) {
			dbSong.awesomes++;
			dbSong.save();
		}
	});
}

Songs.prototype.lame = function(song) {
	songsDb.findOne({title: song.title, artist: song.artist}, function(err, dbSong) {
		if(err) {
			throw new Error(err);
		}

		if(dbSong !== null) {
			dbSong.lames++;
			dbSong.save();
		}
	});
}

Songs.prototype.get = function(title, callback) {
	songsDb.find({title: title}, function(err, songs) {
		if(err) {
			throw new Error(err);
		}

		if(typeof(callback) === "function") {
			callback(songs);
		}
	});
}

module.exports.songs = exports = new Songs();