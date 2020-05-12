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
	  	Notification 	= require('../models/notification.js');

//========================================================================
//Notifications page for user and path to get there.
//========================================================================
router.get('/', middlewareObj.isLoggedIn, middlewareObj.isVerified, async function(req, res) {
	try {
		let user = await User.findById(req.user._id).populate({
			path:'notifications',
			populate:{
				path:'user campground comment review',
				populate:{
					path:'campground', 
					select:'title'
				}, 
				select:'username title'
			},  
			options:{
				sort:{
					_id: -1
				}
			}
		}).exec();
		
		let allNotifications = user.notifications;
		res.render('notifications/index', { allNotifications });
	} catch (err) {
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});
//============================================================================
// handle notification
//============================================================================
router.get('/:id', middlewareObj.isLoggedIn, middlewareObj.isVerified, async function(req, res) {
	try {
		let notification = await Notification.findById(req.params.id);
		let campground = await Campgrounds.findById(notification.campground);
		notification.isRead = true;
		await notification.save();

		if(campground){
			return res.redirect(`/campgrounds/${notification.campground}`);	
		}
		let comment = await Comments.findById(notification.comment).populate('campground').exec();
		if(comment){
			return res.redirect(`/campgrounds/${comment.campground._id}`);	
		}
		let review = await 	Review.findById(notification.review).populate('campground').exec();
		if(review){
			return res.redirect(`/campgrounds/${review.campground._id}`);
		}
		flashMessageObj.errorCampgroundMessage(req, res, 'Cannot not find notification');
		
	} catch (err) {
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});

module.exports = router;