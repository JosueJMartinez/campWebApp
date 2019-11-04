const	mongoose = require('mongoose'),
		passportLocalMongoose = require('passport-local-mongoose');

//Schema setup
const userSchema = new mongoose.Schema({
	username: String,
	password:String,
	createdAt: { 
		type: Date, 
		default: Date.now 
	},
	isAdmin:{
		type:Boolean,
		default:false
	}
});

userSchema.plugin(passportLocalMongoose);
// variable to use mongoose functions also creates collection for campgrounds
module.exports = mongoose.model("User", userSchema);