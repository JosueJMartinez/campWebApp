const 	Campground    	= require('../models/campground'), 
		Comment         = require('../models/comment'),
  		flashMessageObj = require('../messages'),
		Review			= require('../models/review');



var middlewareObj = {};

//======================================================
//check ownership of campground with logged in user
middlewareObj.checkOwnership = (req, res, next) => {
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id, (err, foundCampground) => {
            if (err || !foundCampground) {
                flashMessageObj.errorCampgroundMessage(req, res, 'Could not find Campground');
            }
            else {
                if (foundCampground.author._id.equals(req.user._id)||req.user.isAdmin) {
                    next();
                }
                else {
                    flashMessageObj.errorCampgroundMessage(req, res,'Access denied');
                }
            }
        });
    }else {
        //needs new redirect
		return flashMessageObj.errorCampgroundMessage(req, res,'You need to be logged in to edit page', '/login');
    }
};
//===============================================================
//check ownership of comments with logged in user
middlewareObj.checkCommentOwnership = (req, res, next) => {
    if (req.isAuthenticated()) {
	    Comment.findById(req.params.comment_id, (err, foundComment) => {
            if (err || !foundComment) {
                flashMessageObj.errorCampgroundMessage(req, res, 'Could not find comment');
            }
            else {
                if (foundComment.author._id.equals(req.user._id)||req.user.isAdmin) {
                    next();
                }
                else {
                    flashMessageObj.errorCampgroundMessage(req, res, 'Access denied');
                }
            }
        });
    }
    else {
		return flashMessageObj.errorCampgroundMessage(req, res, 'Please login first', '/login');

    }
};

//------------------------------------------------------
//check to see if user is logged in
middlewareObj.isLoggedIn = (req, res, next) => {
	if (req.isAuthenticated()) {
        return next();
    }
	return flashMessageObj.errorCampgroundMessage(req, res, 'Please login', '/login');
};

//=========================================================================
//main functionality is to if user is logged in then to make 
//sure verified access rest of site, the normal access for regular users
middlewareObj.isVerified = async (req, res, next) =>{
	
	if((req.user && req.user.isVerified) || !req.user){
		return next();
	}
	return flashMessageObj.errorCampgroundMessage(req, res, `${req.user.username} is not verified.`, `/resend`);
}

middlewareObj.checkReviewExistence = async (req, res, next) =>{
	try{
		if(req.isAuthenticated()){
			let campground = await Campground.findById(req.params.id).populate('reviews').exec();
			if(!campground){
				return flashMessageObj.errorCampgroundMessage(req, res, 'Campground does not exist');
			}
			let userReview = campground.reviews.some(review =>{
				return review.author.equals(req.user._id);
			});
			if(userReview){
				return flashMessageObj.errorCampgroundMessage(req, res, 'You have already wrote a review',`/campgrounds/${req.params.id}`);
			}
			return next();
		}
		return flashMessageObj.errorCampgroundMessage(req, res, 'Please login','/login');
	}catch(err){
		
		return flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
};

//=================================================================
//check if user is owner of comment
middlewareObj.checkReviewOwnership = async (req, res, next) =>{
	try{
		if (req.isAuthenticated()) {
	    	let review = await Review.findById(req.params.review_id);
			
            if (!review) {
                return flashMessageObj.errorCampgroundMessage(req, res, 'Could not find review');
            }
			if (!(review.author.equals(req.user._id)||req.user.isAdmin)) {
				return flashMessageObj.errorCampgroundMessage(req, res, 'Access denied');
			}
			next();
    	}
    	else {
			return flashMessageObj.errorCampgroundMessage(req, res, 'Please login first', '/login');
		}
	}catch(err){
		return flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
}

module.exports = middlewareObj;
