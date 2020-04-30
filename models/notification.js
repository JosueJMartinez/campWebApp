var mongoose = require("mongoose");

var notificationSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	campground: {
		type: mongoose.Schema.Types.ObjectId,
		ref:'Campground'
	},
	comment:{
		type: mongoose.Schema.Types.ObjectId,
		ref:'Comment'
	},
	isRead: { 
		type: Boolean, 
		default: false 
	}
});

module.exports = mongoose.model("Notification", notificationSchema);