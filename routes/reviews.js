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
router.get('/', middlewareObj.isVerified, async (req, res) =>{
	try{
		let userReview;
		
		let campground = await Campground.findById(req.params.id).populate({
			path:'reviews',
			options:{sort:{createdAt: -1}},
			populate:{path:'author', select:'username'}
		}).exec();
		
		if(req.user){
			
			for(let i = 0; i < campground.reviews.length; i++){
				if( req.user.id == campground.reviews[i].author._id+''){
					userReview = campground.reviews.splice(i, 1);
					break;
				}
			}
		}
		
		res.render("reviews/index", {campground, userReview});
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});


//=========================================
//Create route for a new review
//=========================================
router.post('/', middlewareObj.isVerified, middlewareObj.checkReviewExistence, async (req, res)=>{
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
		tools.addNotification({user:req.user._id, review: review._id});
		req.flash('success', 'Review has been successfully added');
		res.redirect('/campgrounds/'+campground._id);
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});


//=========================================
//Update route for Review
//update reviews working on adding reviews in show.ejs need to work reviews put update and delete
//need to reformat reviews list
//=========================================
router.put('/:review_id', middlewareObj.isVerified, middlewareObj.checkReviewOwnership, async(req, res)=>{
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
router.delete('/:review_id', middlewareObj.isVerified, middlewareObj.checkReviewOwnership, async(req, res)=>{
	try{
		let review = await Review.findById(req.params.review_id);
		if(!review){
			return flashMessageObj.errorCampgroundMessage(req, res, 'Message is missing');
		}
		await review.remove();
		req.flash('success', 'Deleted Review');
		res.redirect(`/campgrounds/${req.params.id}`);
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});
module.exports = router;
