const   express     	= require('express'),
        router      	= express.Router({mergeParams:true}),
        Campground		= require('../models/campground'),
        Comment     	= require('../models/comment'),
        middlewareObj 	= require('../middleware'),
        flashMessageObj = require('../messages'),
	  	User 			= require('../models/user'),
	    Notification 	= require('../models/notification');

//========================================
//Comments routes
//=========================================
//NEW route for comments
//=========================================
router.get('/new', middlewareObj.isLoggedIn, (req, res) => {

	//find campground by id
	Campground.findById(req.params.id, (err, campground) => {
		if (err || !campground) {
			flashMessageObj.errorCampgroundMessage(req, res, 'Could not find campground');
		}
		else {
			res.render('comments/new', { campground: campground, form:true});
		}
	});

});

//=============================================================
//CREATE route for comments
//=============================================================
router.post('/', middlewareObj.isLoggedIn, (req, res) => {
	Campground.findById(req.params.id, (err, foundCampground) => {
		if (err || !foundCampground) {
			flashMessageObj.errorCampgroundMessage(req, res, 'Could not find campground');
		}
		else {
			
			Comment.create(req.body.comment, async (err, newComment) => {
				if (err|| !newComment) {
					flashMessageObj.errorCampgroundMessage(req, res, 'Could not create new comment');
				}
				else {
					//add username and id to comment
					newComment.author = req.user._id;
					newComment.campground = req.params.id; // store id for campground related to this comment
					newComment.save();
					foundCampground.comments.push(newComment);
					foundCampground.save();
					try{
						let user = await User.findById(req.user._id).populate('followers').exec();
						let newNotification = {
							user: req.user._id,
							comment: newComment._id
						};
						let notification = await Notification.create(newNotification);
						for(const follower of user.followers){
							follower.notifications.push(notification);
							follower.save();
						}
						req.flash('success','Created new comment');
						res.redirect('/campgrounds/' + req.params.id);
					}catch(err){
						flashMessageObj.errorCampgroundMessage(req, res, err.message);
					}
					
				}
			});
		}
	});
});

//==============================================
//EDIT route for comments
router.get('/:comment_id/edit', middlewareObj.checkCommentOwnership, (req,res)=>{
	// console.log('test error here');
	Comment.findById(req.params.comment_id,(err, foundComment)=>{
		if(err || !foundComment){
			flashMessageObj.errorCampgroundMessage(req, res, 'Could not find comment');
		}else{
			return res.render('comments/edit', {campground_id:req.params.id, comment:foundComment, form:true});
		}
	});
});
//=============================================
//UPDATE Route comments
router.put('/:comment_id', middlewareObj.checkCommentOwnership, (req,res)=>{
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment,(err, foundComment)=>{
		if(err || !foundComment){
			flashMessageObj.errorCampgroundMessage(req, res, 'Could not update comment');
		}else{
			req.flash('success','Updated comment');
			res.redirect('/campgrounds/'+req.params.id);
		}
	});
});

//=====================================================
//DESTROY Route for comments
router.delete('/:comment_id', middlewareObj.checkCommentOwnership,(req,res)=>{
	Comment.findById(req.params.comment_id,function(err, foundComment){
		if(err ||!foundComment){
			err.message = 'Could not delete comment';
			flashMessageObj.errorCampgroundMessage(req,res,err.message);
		}else{
			foundComment.remove(err=>{
				if(err){
					flashMessageObj.errorCampgroundMessage(req,res,err.message);
				}else{
					req.flash('success','Deleted comment');
					res.redirect('/campgrounds/'+req.params.id);
				}
			});
		}
	});
});


module.exports = router;