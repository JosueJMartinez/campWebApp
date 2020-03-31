const   express     	= require('express'),
        router      	= express.Router(),
        User			= require('../models/user'),
        passport    	= require('passport'),
        middlewareObj	= require('../middleware'),
        flashMessageObj = require('../messages'),
		Campgrounds		= require('../models/campground.js'),
	  	TOOLS			= require('../tools'),
	  	tools			= new TOOLS(),
		async 			= require('async'),
		nodemailer 		= require('nodemailer'),
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
	var boolVars ={};
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

router.post('/register',(req,res)=>{
	var userWeb = req.body.user;
	userWeb.username = req.body.username;
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
		passport.authenticate('local')( req, res, ()=>{
			req.flash('success','Welcome to Yelpcamp '+user.username+"!");
			res.redirect('/campgrounds');
		});}
	});
});

//=======================================================
//login routes
//======================================================
router.get('/login',(req,res)=>{
	res.render('auth/login', {page:'login'});
});


router.post('/login', passport.authenticate('local',{
	successRedirect:'/campgrounds',
	failureRedirect:'/login',
	successFlash:'Welcome back!',
	failureFlash:true
	})
);

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
	
		
		var mailOptions = {
			from:process.env.EMAIL,
			to: user.email, // list of receivers
			subject: 'Reset Password for YelpCamp', // Subject line
			text: 'You are reseting your password'+'\n\n'+
			'http://'+ req.headers.host + '/reset/'+ token + '\n\n' +
			'testing this feature at the moment', // plain text body
		};
		
		smtpTransport.sendMail(mailOptions, err =>{
			console.log('email sent');
			req.flash('success', 'An email has been sent to '+ user.email + ' with further instructions.');
			done(err, 'done');
		});
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

      		var mailOptions = {
				to: user.email,
				from: process.env.EMAIL,
				subject: 'Your password has been changed',
				text: 'Hello,\n\n' +
				  'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
			};
      		smtpTransport.sendMail(mailOptions, function(err) {
				req.flash('success', 'Success! Your password has been changed.');
				done(err);
      		});
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

module.exports = router;