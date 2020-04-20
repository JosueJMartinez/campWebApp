const Campground    = require('../models/campground'), 
    Comment         = require('../models/comment'),
    flashMessageObj = require('../messages');



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

module.exports = middlewareObj;
