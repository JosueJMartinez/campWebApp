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
                flashMessageObj.throwNewError(req, res, 'Could not find Campground');
            }
            else {
                if (foundCampground.author.id.equals(req.user._id)) {
                    next();
                }
                else {
                    flashMessageObj.throwNewError(req, res,'Access denied');
                }
            }
        });
    }else {
        //needs new redirect
        req.flash('error','You need to be logged in to edit page');
        res.redirect('/login');
    }
};
//===============================================================
//check ownership of comments with logged in user
middlewareObj.checkCommentOwnership = (req, res, next) => {
    if (req.isAuthenticated()) {
	    Comment.findById(req.params.comment_id, (err, foundComment) => {
            if (err || !foundComment) {
                flashMessageObj.throwNewError(req, res, 'Could not find comment');
            }
            else {
                if (foundComment.author.id.equals(req.user._id)) {
                    next();
                }
                else {
                    flashMessageObj.throwNewError(req, res, 'Access denied');
                }
            }
        });
    }
    else {
        req.flash('error','Please login first');
        res.redirect('/login');
    }
};

//------------------------------------------------------
//check to see if user is logged in
middlewareObj.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'Please login');
    res.redirect('/login');
};

module.exports = middlewareObj;
