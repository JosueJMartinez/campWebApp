const 	express = 			require("express"),
		router = 			express.Router({mergeParams: true}),
		Campground =		require("../models/campground"),
		Review = 			require("../models/review"),
	  	User =				require('../models/user'),
	  	Notification =		require('../models/notification'),
		flashMessageObj = 	require("../messages"),
		middlewareObj = 		require("../middleware"),
	  	TOOLS = 			require('../tools'),
		tools = 			new TOOLS();

//========================================
//Index get route for reviews
//========================================
router.get('/', async (req, res) =>{
	try{
		let campground = await Campground.findById(req.params.id).populate({
			path:'reviews',
			options:{sort:{createdAt: -1}},
			populate:{path:'author', select:'username'}
		}).exec();
		res.render("reviews/index", {campground});
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});

//========================================
//New route for review page
//========================================
router.get('/new', middlewareObj.isLoggedIn, middlewareObj.checkReviewExistence, async (req, res)=>{
	try{
		let campground = await Campground.findById(req.params.id);
		res.render('reviews/new', {campground});
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});

//=========================================
//Create route for a new review
//=========================================
router.post('/', middlewareObj.isLoggedIn, middlewareObj.checkReviewExistence, async (req, res)=>{
	try{
		let campground = await Campground.findById(req.params.id).populate('reviews');
		if(!campground){
			return flashMessageObj.errorCampgroundMessage(req, res, 'Could not find campground');
		}
		req.body.review.author = req.user._id;
		req.body.review.campground = campground._id;
		let review = await Review.create(req.body.review);
		campground.reviews.push(review);
		let avgRating = tools.calcAvg(campground.reviews);
		campground.rating = avgRating;
		await campground.save();
		let user = await User.findById(req.user._id).populate('followers').exec();
		let newNotification ={
			user:req.user._id,
			review: review._id
		}
		let notification = await Notification.create(newNotification);
		for(const follower of user.followers){
			follower.notifications.push(notification);
			await follower.save();
		}
		req.flash('success', 'Review has been successfully added');
		res.redirect('/campgrounds/'+campground._id);
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});

//============================================
//Edit Route for reviews
//============================================
router.get('/:review_id/edit', middlewareObj.checkReviewOwnership, async(req, res)=>{
	try{
		let review = await Review.findById(req.params.review_id);
		if(!review){
			return flashMessageObj.errorCampgroundMessage(req, res, 'Could not find review!');
		}
		let campground = await Campground.findById(req.params.id);
		//eval(require('locus'));
		return res.render('reviews/edit',{campground_id:req.params.id, review});
	}catch(err){
		return flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});

//=========================================
//Update route for Review
//update reviews working on adding reviews in show.ejs need to work reviews put update and delete
//need to reformat reviews list
//=========================================
router.put('/:review_id', middlewareObj.checkReviewOwnership, async(req, res)=>{
	try{
		let review = await Review.findByIdAndUpdate(req.params.review_id,req.body.review);
		if(!review){
			return flashMessageObj.errorCampgroundMessage(req, res, 'Could not update review please try again later');
		}
		let campground = await Campground.findById(req.params.id).populate('reviews');
		let avgRating = tools.calcAvg(campground.reviews);
		campground.rating = avgRating;
		await campground.save();
		req.flash('success','Update review');
		res.redirect('/campgrounds/'+req.params.id);
	}catch(err){
		return flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});

//=====================================================================================
//Destroy routes for review
//=====================================================================================
router.delete('/:review_id', middlewareObj.checkReviewOwnership, async(req, res)=>{
	try{
		let review = await Review.findById(req.params.review_id);
		if(!review){
			return flashMessageObj.errorCampgroundMessage(req, res, 'Message is missing');
		}
		review.remove();
		req.flash('success', 'Deleted Review');
		res.redirect(`/campgrounds/${req.params.id}`);
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});
module.exports = router;
