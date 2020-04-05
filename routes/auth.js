const   express     	= require('express'),
        router      	= express.Router(),
        User			= require('../models/user'),
        passport    	= require('passport'),
        middlewareObj	= require('../middleware'),
        flashMessageObj = require('../messages'),
		Campgrounds		= require('../models/campground.js'),
		TOOLS			= require('../tools'),
		Token			= require('../models/token.js'),
		tools			= new TOOLS(),
		async 			= require('async');

const	nodemailer 		= require('nodemailer'),
		crypto 			= require('crypto'),
		{ google } 		= require("googleapis"),
		OAuth2 			= google.auth.OAuth2;
		
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

var checkCamps = (campgrounds) =>{
	var boolVars = {};
	if(tools.isEmpty(campgrounds)){

		return boolVars.haveCamps = false;
	}else{
		return boolVars.haveCamps = true;
	}
	//return boolVars;
}

//===============================================================
//register routes
//==============================================================
router.get('/register',(req,res)=>{
	res.render('auth/register', {page:'register'});
});

router.post('/register',(req, res)=>{
	// eval(require('locus'));

	var userWeb = req.body.user;
	userWeb.username = req.body.username;
	if(req.body.password !== req.body.rePassword){
		flashMessageObj.errorCampgroundMessage(req, res, {message: "Passwords do not match up"});
	}else{
		User.findOne({email:userWeb.email},(err, user)=>{
			// eval(require('locus'));
			if(user){
				console.log('user exists');
				flashMessageObj.errorCampgroundMessage(req, res, {message:'Already have an email that exists'});
			}else{
				if(err){
					res.redirect('back');
				}
				var newUser = new User(userWeb);

				//eval(require('locus'));
				if(req.body.adminCode==='RubADubDub'){
					newUser.isAdmin = true;
				}
				User.register(newUser, req.body.password,(err,user)=>{
					if(err){
						console.log(err);
						flashMessageObj.errorCampgroundMessage(req, res, err);
					}else{
						var token = new Token({
							_userId: user._id,
							token: crypto.randomBytes(16).toString('hex')
						});
						token.save(err =>{
							if(err){return errorCampgroundMessage(req, res, err);}
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
        if (!token) return flashMessageObj.errorCampgroundMessage(req, res, {message:'We were unable to find a valid token. Your token my have expired.' });
 		//eval(require('locus'));
        // If we found a token, find a matching user
        User.findOne({ _id: token._userId}, function (err, user) {
			
            if (!user) return flashMessageObj.errorCampgroundMessage(req, res, {message:'We were unable to find a user for this token.' });
            if (user.isVerified) return flashMessageObj.errorCampgroundMessage(req, res, {message:'This user has already been verified.' });
 
            // Verify and save the user
            user.isVerified = true;
            user.save(function (err) {
                if (err) { return flashMessageObj.errorCampgroundMessage(req, res, err); }
				req.flash('success','Account has been verified, please login');
                res.redirect('/login');
            });
        });
    });
});

router.get('/resend', (req, res, err)=>{
	if(err) return flashMessageObj.errorCampgroundMessage(req, res, err);
	User.findOne({ email: req.body.email }, function (err, user) {
		if (!user) return flashMessageObj.errorCampgroundMessage(req, res,{ message: 'We were unable to find a user with that email.' });
		if (user.isVerified) return flashMessageObj.errorCampgroundMessage(req, res,{ message: 'This account has already been verified. Please log in.' });

		// Create a verification token, save it, and send email
		var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });

		// Save the token
		token.save(function (err) {
			if (err) { return flashMessageObj.errorCampgroundMessage(req, res, {message: err.message }); }
			sendEmail({user, value:3, token},req, res);
		});
	});
});

//=======================================================
//login routes
//======================================================
router.get('/login',(req,res)=>{
	res.render('auth/login', {page:'login'});
});


router.post('/login', (req,res,next) => {
	passport.authenticate('local', function(err, user, info) {
		if (err) { 
			return flashMessageObj.errorCampgroundMessage(req, res, err); 
		}
		if (!user) { 
			return flashMessageObj.errorCampgroundMessage(req, res, {message: 'Account does not exist'}); 
		}
		if(!user.isVerified){ 
			return flashMessageObj.errorCampgroundMessage(req, res, {message: 'Account is not verified'});
		}
		req.logIn(user, function(err) {
			if (err) { return flashMessageObj.errorCampgroundMessage(req, res, err); }
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
	res.render('auth/forgot');
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
				req.flash('error', 'No account has this email');
				return res.redirect('/forgot');
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
		res.redirect('/forgot');
	});
});

router.get('/reset/:token',(req, res) =>{
	User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
    	if (!user) {
      		req.flash('error', 'Password reset token is invalid or has expired.');
      		return res.redirect('/forgot');
    	}
    	res.render('auth/reset', {token: req.params.token});
	});
});

router.post('/reset/:token', function(req, res) {
	async.waterfall([
    	function(done) {
      		User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
				if (!user) {
					req.flash('error', 'Password reset token is invalid or has expired.');
					return res.redirect('back');
				}
				if(req.body.password === req.body.confirm) {
					user.setPassword(req.body.password, function(err) {
						user.resetPasswordToken = undefined;
						user.resetPasswordExpires = undefined;

						user.save(function(err) {
							req.logIn(user, function(err) {
								console.log(err, user);
								console.log(req.body);
								done(err, user);
							});
						});
					})
				} else {
					req.flash("error", "Passwords do not match.");
					return res.redirect('back');
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
	Campgrounds.find({'author.id':req.user.id}, (err, campgrounds)=>{
		if(err || !campgrounds){
			flashMessageObj.throwNewError(req, res, 'Could not connect to campground try again');
		}else{
			var boolVars = checkCamps(campgrounds);
			res.render('userprofile', { campgrounds: campgrounds, boolVars:boolVars });
		}
	});
});

//===============================================
//route for other users profiles
//===============================================
router.get('/profiles/:id', (req, res) => {
	User.findById(req.params.id, (err, user) => {
		if (err || !user) {
			flashMessageObj.throwNewError(req, res, 'Could not find missing profile try again later');
		} else {
			Campgrounds.find({'author.id':req.params.id}, (err, campgrounds)=>{
				if(err || !campgrounds){
					flashMessageObj.throwNewError(req, res, 'Could not connect to campground try again');
				}else{
					var boolVars = checkCamps(campgrounds);
					res.render('profiles', { user: user, campgrounds: campgrounds, boolVars: boolVars });
				}
			});
		}
	});
});

//================================================
//route to test secret page for logged in or out testing
//================================================
router.get('/secret', middlewareObj.isLoggedIn, (req, res)=>{
	res.render('secret');	
});

sendEmail = (inputs, req, res) =>{
	const accessToken = oauth2Client.getAccessToken();
	console.log(accessToken);

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
				return errorCampgroundMessage(req, res, err);
			}
			req.flash('success', 'A verification email has been sent to '+ inputs.user.email+'.');
			res.redirect('/campgrounds');
		});
	}

}

module.exports = router;