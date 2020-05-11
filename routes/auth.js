const   express     	= require('express'),
        router      	= express.Router(),
        User			= require('../models/user'),
        passport    	= require('passport'),
        middlewareObj	= require('../middleware'),
        flashMessageObj = require('../messages'),
		Campgrounds		= require('../models/campground.js'),
	  	Comments		= require('../models/comment.js'),
	  	Review			= require('../models/review.js'),
		TOOLS			= require('../tools'),
		tools			= new TOOLS(),
		Token			= require('../models/token.js'),
	  	Notification 	= require('../models/notification.js'),
		async 			= require('async');

const	nodemailer 		= require('nodemailer'),
		crypto 			= require('crypto'),
		{ google } 		= require("googleapis"),
		OAuth2 			= google.auth.OAuth2;
//=============================================
// Setup for uploading images to webApp
//=============================================
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: imageFilter}).single('avatar');

function uploadFile(req, res, next){
	upload(req, res, err =>{
		if(err){
			return flashMessageObj.errorCampgroundMessage(req, res, err.message);
		}
		next();
	});
}

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'josuemartinez', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});
		
//============================================
//set up OAUTH client to send emails
//============================================
const oauth2Client = new OAuth2(
	 process.env.EMAILCLIENTID, // ClientID
	 process.env.EMAILCLIENTSECRET, // Client Secret
	 "https://developers.google.com/oauthplayground" // Redirect URL
);
//============================================
//setUp refreshToken for gmail
//============================================
oauth2Client.setCredentials({
	 refresh_token: process.env.REFRESHTOKEN
});


//root page route
router.get('/', (req, res) => {

	res.render('landing');
});

var checkObject = (objects) =>{
	if(tools.isEmpty(objects)){
		return false;
	}
	return true;
	//return boolVars;
}

//=============================================================
//Function for emails to send various emails considering situation
//inputs is an object with user email, token, and value which decides the setup
//=============================================================
sendEmail = (inputs, req, res) =>{
	const accessToken = oauth2Client.getAccessToken();
	// console.log(accessToken);

	//set up mail transport to send emails
	const smtpTransport = nodemailer.createTransport({
		service: 'Gmail',
		auth:{
			  type: "OAuth2",
			  user: "josuedevtesting@gmail.com", 
			  clientId: process.env.EMAILCLIENTID,
			  clientSecret: process.env.EMAILCLIENTSECRET,
			  refreshToken: process.env.REFRESHTOKEN,
			  accessToken: accessToken
		}
	});


	smtpTransport.verify(function(error, success) {
		if (error) {
			console.log(error);
			console.log('test2');
			
		} else {
			console.log('Server is ready to take our messages');
		}
	});


	if(inputs.value === 1){
		var mailOptions = {
			from:process.env.EMAIL,
			to: inputs.user.email, // list of receivers
			subject: 'Reset Password for YelpCamp', // Subject line
			text: 'You are reseting your password'+'\n\n'+
			'http://'+ req.headers.host + '/reset/'+ inputs.token + '\n\n' +
			'testing this feature at the moment', // plain text body
		};
		smtpTransport.sendMail(mailOptions, err =>{
			console.log('email sent');
			req.flash('success', 'An email has been sent to '+ inputs.user.email + ' with further instructions.');
			inputs.done(err, 'done');
		});
	}else if(inputs.value === 2){
		var mailOptions = {
			to: inputs.user.email,
			from: process.env.EMAIL,
			subject: 'Your password has been changed',
			text: 'Hello,\n\n' +
			  'This is a confirmation that the password for your account ' + inputs.user.email + ' has just been changed.\n'
		};
		smtpTransport.sendMail(mailOptions, function(err) {
			req.flash('success', 'Success! Your password has been changed.');
			inputs.done(err);
		});
	}else if(inputs.value === 3){
		var mailOptions = {
			to: inputs.user.email,
			from: process.env.EMAIL,
			subject: 'Account Verification for YelpCamp',
			text: 'Hello,\n\n' +
			  'Please verify your account by clicking on this link: \n http:\/\/' + req.headers.host + '\/confirmation\/' + inputs.token.token + '.\n'
		};
		smtpTransport.sendMail(mailOptions, function(err) {
			if(err){
				return flashMessageObj.errorCampgroundMessage(req, res, err.message);
			}
			req.flash('success', 'A verification email has been sent to '+ inputs.user.email+'.');
			res.redirect('/campgrounds');
		});
	}

}
//=================================================================

//===============================================================
//register routes
//==============================================================
router.get('/register',(req,res)=>{
	res.render('auth/register', {page:'register', form:true});
});

router.post('/register', uploadFile, (req, res)=>{
	var userWeb = req.body.user;
	userWeb.username = req.body.username.trim();
	if(req.body.password !== req.body.rePassword){
		flashMessageObj.errorCampgroundMessage(req, res, "Passwords do not match up");
	}else{
		User.findOne({email:userWeb.email}, async (err, user)=>{
			// eval(require('locus'));
			
			if(user){
				console.log('user exists');
				flashMessageObj.errorCampgroundMessage(req, res, 'Already have an email that exists');
			}else{
				if(req.file){
					try{
						
						let result = await cloudinary.v2.uploader.upload(req.file.path);
						userWeb.avatar = result.secure_url;
						userWeb.avatarId = result.public_id;
					}catch(err){
						return flashMessageObj.errorCampgroundMessage(req, res, 'Could not upload image try again.');
					}
				}
				
				if(err){
					return flashMessageObj.errorCampgroundMessage(req, res, err.message);
				}
				var newUser = new User(userWeb);

				//eval(require('locus'));
				if(req.body.adminCode===process.env.ADMIN_PW){
					newUser.isAdmin = true;
				}
				User.register(newUser, req.body.password,(err,user)=>{
					if(err){
						// console.log(err);
						flashMessageObj.errorCampgroundMessage(req, res, err.message);
					}else{
						var token = new Token({
							_userId: user._id,
							token: crypto.randomBytes(16).toString('hex')
						});
						token.save(err =>{
							if(err){return flashMessageObj.errorCampgroundMessage(req, res, err.message);}
							sendEmail({user, value:3, token},req, res);
						})
					}

				});
			}
		});
	}
});
//===============================================================
//Confirmation routes used to confirm account with an email
//===============================================================
router.get('/confirmation/:token', (req, res, err)=>{

    Token.findOne({ token: req.params.token }, function (err, token) {
        if (!token) return flashMessageObj.errorCampgroundMessage(req, res, 'Verification expired please login again to resend verification', '/login');
 		//eval(require('locus'));
        // If we found a token, find a matching user
        User.findOne({ _id: token._userId}, function (err, user) {
			
            if (!user) return flashMessageObj.errorCampgroundMessage(req, res, 'There is no user by this name');
            if (user.isVerified) return flashMessageObj.errorCampgroundMessage(req, res, 'This user has already been verified.');
 
            // Verify and save the user
            user.isVerified = true;
            user.save(function (err) {
                if (err) { return flashMessageObj.errorCampgroundMessage(req, res, err.message); }
				req.flash('success','Account has been verified, please login');
                res.redirect('/login');
            });
        });
    });
});
//=====================================================
//resend email verification
router.post('/resend', async (req, res)=>{
	try{
		//im here trying to get email correct
		let user = await User.findById(req.body.user_id,{email:1, isVerified:1});
		
		if (!user) return flashMessageObj.errorCampgroundMessage(req, res, 'We were unable to find user. Please try again');
		if (user.isVerified) return flashMessageObj.errorCampgroundMessage(req, res, 'This account has already been verified. Please log in.');
		if(req.body.email){
			let check = await User.find({email:req.body.email},{email:1});
			if(check.email) return flashMessageObj.errorCampgroundMessage(req, res, 'This email already exists', '/resend');
			user.email = req.body.email;
			await user.save();
		}
		

		// Create a verification token, save it, and send email
		var token = await new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });

		// Save the token
		await token.save();
		await sendEmail({user, value:3, token},req, res);
	}catch(err){
		return flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});

//=======================================================
//login routes
//======================================================
router.get('/login',(req,res)=>{
	res.render('auth/login', {page:'login', form:true});
});

router.post('/login', (req,res,next) => {
	passport.authenticate('local', function(err, user, info) {
		if (err) {
			return flashMessageObj.errorCampgroundMessage(req, res, err.message);
		}
		if (!user) {
			return flashMessageObj.errorCampgroundMessage(req, res,'Account does not exist or password is not correct');
		}
		if(!user.isVerified){
			return flashMessageObj.errorCampgroundMessage(req, res, `Account is for user ${user.username} not verified!`, `auth/resend`, {username: user.username, email:user.email, userId: user._id});
		}
		req.logIn(user, function(err) {
			if (err) return flashMessageObj.errorCampgroundMessage(req, res, err.message);
			
			req.flash('success','Welcome back ' + user.username + '!');
			return res.redirect('/campgrounds');
		});
	  })(req, res, next);
});

//===================================================
//logout routes
//===================================================
router.get('/logout',(req,res)=>{
	req.logout();
	req.flash('success','You are now logged out');
	res.redirect('/campgrounds');
});

//=================================================
//forgot password routes
//=================================================
router.get('/forgot', (req, res)=>{
	res.render('auth/forgot', {form:true});
});

router.post('/forgot', (req, res, next)=>{
	async.waterfall([done =>{
		crypto.randomBytes(20, (err, buf) =>{
			var token = buf.toString('hex');
			done(err, token);
		});
	},
	(token, done) =>{
		User.findOne({email:req.body.email}, (err, user)=>{
			if(!user){
				return flashMessageObj.errorCampgroundMessage(req, res, 'No account has this email');	
			}
			user.resetPasswordToken = token;
			user.resetPasswordExpires = Date.now() + 3600000;
			
			user.save(err => {
				done(err, token, user);
			});
		});
	},
	(token, user, done) => {
		sendEmail({token, user, done, value:1}, req);
	}],
	err => {
		if(err) return next(err);
		res.redirect('/campgrounds');
	});
});

router.get('/reset/:token',(req, res) =>{
	User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }}, (err, user) => {
    	if (!user) {
			return flashMessageObj.errorCampgroundMessage(req, res, 'Password reset token is invalid or has expired.', '/forgot');
    	}
    	res.render('auth/reset', {token: req.params.token});
	});
});

router.post('/reset/:token', function(req, res) {
	async.waterfall([
    	function(done) {
      		User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now()}}, function(err, user) {
				if (!user) {
					return flashMessageObj.errorCampgroundMessage(req, res, 'Password reset token is invalid or has expired.');
				}
				if(req.body.password === req.body.confirm) {
					user.setPassword(req.body.password, function(err) {
						user.resetPasswordToken = undefined;
						user.resetPasswordExpires = undefined;

						user.save(function(err) {
							req.logIn(user, function(err) {
								// console.log(err, user);
								// console.log(req.body);
								done(err, user);
							});
						});
					})
				} else {
					return flashMessageObj.errorCampgroundMessage(req, res, 'Passwords do not match.');
				}
      		});
    	},
		function(user, done) {
			sendEmail({user, done, value:2}, req);
    	}
  	], function(err) {
    	res.redirect('/campgrounds');
  	});
});

//=======================================================
//User profile
//=======================================================
router.get('/userprofile', middlewareObj.isLoggedIn, (req, res, err) => {
	Campgrounds.find({'author':req.user.id}, (err, campgrounds)=>{
		if(err || !campgrounds){
			flashMessageObj.errorCampgroundMessage(req, res, 'Could not connect to campground try again');
		}else{
			var haveCamps = checkObject(campgrounds);
			Comments.find({'author':req.user.id}).populate('campground').exec((err, comments)=>{
				if(err||!comments) return flashMessageObj.errorCampgroundMessage(req, res, 'Something went wrong finding the comments');
				var haveComments = checkObject(comments);
				res.render('userprofile', { campgrounds: campgrounds, haveCamps:haveCamps, page:'profile', haveComments, comments});
			});
		}
	});
});

//===============================================
//route for other users profiles
//===============================================
router.get('/profiles/:id', (req, res) => {
	User.findById(req.params.id).populate('followers').exec((err, user) => {
		if (err || !user) {
			flashMessageObj.errorCampgroundMessage(req, res, 'Could not find missing profile try again later');
		} else {
			Campgrounds.find({'author':req.params.id}, (err, campgrounds)=>{
				if(err || !campgrounds){
					flashMessageObj.errorCampgroundMessage(req, res, 'Could not connect to campground try again');
				}else{
					var haveCamps = checkObject(campgrounds);
					
					Comments.find({'author':req.params.id}).populate('campground').exec((err, comments)=>{
						if(err||!comments) return flashMessageObj.errorCampgroundMessage(req, res, 'Something went wrong finding the comments');
						var haveComments = checkObject(comments);
						let isFollower = false;
						if(req.user){
							for(const follower of user.followers){
								
								if(req.user.id == follower._id){
									isFollower = true;
									break;
								}
							}
						}
						res.render('profiles', {user: user, campgrounds: campgrounds, haveCamps: haveCamps, page:'profiles', haveComments, comments, isFollower});
					});
				}
			});
		}
	});
});

//============================================================================
//route to test secret page for logged in or out testing
//============================================================================
router.get('/secret', middlewareObj.isLoggedIn, (req, res)=>{
	res.render('secret');	
});


module.exports = router;