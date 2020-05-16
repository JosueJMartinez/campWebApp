const   express     	= require('express'),
        router      	= express.Router({mergeParams:true}),
        Campground		= require('../models/campground'),
        Comment     	= require('../models/comment'),
        middlewareObj 	= require('../middleware'),
        flashMessageObj = require('../messages'),
	  	User 			= require('../models/user'),
	    Notification 	= require('../models/notification'),
		TOOLS			= 	require('../tools'),
		tools			= 	new TOOLS();

//========================================
//Index comment route
//=========================================
router.get('/', middlewareObj.isVerified, async (req, res)=>{
	try{
		let campground = await Campground.findById(req.params.id).populate({
			path:'comments',
			options:{sort:{createdAt:-1}},
			populate:{path:'author', select:'username avatar'}
		}).exec();
		res.render('comments/index',{campground});
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});

//=============================================================
//CREATE route for comments
//=============================================================
router.post('/', middlewareObj.isLoggedIn, middlewareObj.isVerified, (req, res) => {
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
					tools.addNotification({user:req.user._id, comment: newComment._id});
					req.flash('success','Created new comment');
					res.redirect('/campgrounds/' + req.params.id);			
				}
			});
		}
	});
});

//=============================================
//UPDATE Route comments
router.put('/:comment_id', middlewareObj.isVerified, middlewareObj.checkCommentOwnership, (req,res)=>{
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
router.delete('/:comment_id', middlewareObj.isVerified, middlewareObj.checkCommentOwnership,(req,res)=>{
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