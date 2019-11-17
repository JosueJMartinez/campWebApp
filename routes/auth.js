const   express     	= require('express'),
        router      	= express.Router(),
        User			= require('../models/user'),
        passport    	= require('passport'),
        middlewareObj	= require('../middleware'),
        flashMessageObj = require('../messages'),
		Campgrounds		= require('../models/campground.js'),
	  	TOOLS			= require('../tools'),
	  	tools			= new TOOLS();
        
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
	var newUser = new User(req.body.user);
	
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

//===========================================
//User profile
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