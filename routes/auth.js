const   express     	= require('express'),
        router      	= express.Router(),
        User			= require('../models/user'),
        passport    	= require('passport'),
        middlewareObj	= require('../middleware'),
        flashMessageObj = require('../messages');
        
//root page route
router.get('/', (req, res) => {

	res.render('landing');
});

//===============================================================
//register routes
//==============================================================
router.get('/register',(req,res)=>{
	res.render('auth/register', {page:'register'});
});

router.post('/register',(req,res)=>{
	User.register(new User({username:req.body.username}), req.body.password,(err,user)=>{
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
// http://localhost:8080
//	https://6fc945b502f1413985737fab6d36812f.vfs.cloud9.us-east-2.amazonaws.com/*
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

//================================================
//route to test secret page for logged in or out testing
//================================================
router.get('/secret', middlewareObj.isLoggedIn, (req, res)=>{
	res.render('secret');	
});

module.exports = router;