const	mongoose = require('mongoose'),
		passportLocalMongoose = require('passport-local-mongoose');

//Schema setup
const userSchema = new mongoose.Schema({
	username: String,
	password:String,
	avatar:{
		type:String,
		default:'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=634&q=80'
	},
	firstName:String,
	lastName:String,
	email:String,
	createdAt: { 
		type: Date, 
		default: Date.now 
	},
	isAdmin:{
		type:Boolean,
		default:false
	}
});

//for passport set up
userSchema.plugin(passportLocalMongoose);
// variable to use mongoose functions also creates collection for campgrounds
module.exports = mongoose.model("User", userSchema);
