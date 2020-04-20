const	mongoose 				= require('mongoose'),
		passportLocalMongoose 	= require('passport-local-mongoose');

//Schema setup
const userSchema = new mongoose.Schema({
	username: {
		type: String, 
		unique: true, 
		required: true
	},
	password: String,
	avatar: {
		type: String,
		default:'https://res.cloudinary.com/josuemartinez/image/upload/v1586652261/default-file-avatar-img.jpg'
	},
	avatarId: {
		type: String,
		default: 'default-file-avatar-img'
	},
	firstName: String,
	lastName: String,
	email: {
		type: String, 
		unique: true, 
		required: true
	},
	createdAt: { 
		type: Date, 
		default: Date.now 
	},
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	isAdmin:{
		type:Boolean,
		default: false
	},
	isVerified:{
		type: Boolean,
		default: false
	}
});

//for passport set up
userSchema.plugin(passportLocalMongoose);
// variable to use mongoose functions also creates collection for campgrounds
module.exports = mongoose.model("User", userSchema);