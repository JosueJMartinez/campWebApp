
const   express     = require('express'),
        router      = express.Router({mergeParams:true}),
        Campground	= require('../models/campground'),
        Comment     = require('../models/comment'),
        middlewareObj = require('../middleware'),
        flashMessageObj = require('../messages');

//========================================
//Comments routes
//=========================================
//NEW route for comments
//=========================================
router.get('/new',middlewareObj.isLoggedIn, (req, res) => {

	//find campground by id
	Campground.findById(req.params.id, (err, campground) => {
		if (err || !campground) {
			flashMessageObj.throwNewError(req, res, 'Could not find campground');
		}
		else {
			res.render('comments/new', { campground: campground});
		}
	});

});

//=============================================================
//CREATE route for comments
//=============================================================
router.post('/', middlewareObj.isLoggedIn, (req, res) => {
	Campground.findById(req.params.id, (err, foundCampground) => {
		if (err || !foundCampground) {
			flashMessageObj.throwNewError(req, res, 'Could not find campground');
		}
		else {
			
			Comment.create(req.body.comment, (err, newComment) => {
				if (err|| !newComment) {
					flashMessageObj.throwNewError(req, res, 'Could not create new comment');
				}
				else {
					//add username and id to comment
					newComment.author.id = req.user._id;
					newComment.author.username = req.user.username;
					
					newComment.campground = req.params.id; // store id for campground related to this comment
					
					newComment.save();
					
					foundCampground.comments.push(newComment);
					foundCampground.save();
					
					req.flash('success','Created new comment');
					res.redirect('/campgrounds/' + req.params.id);
				}
			});
		}
	});
});

//==============================================
//EDIT route for comments
router.get('/:comment_id/edit', middlewareObj.checkCommentOwnership, (req,res)=>{
	console.log('test error here');
	Comment.findById(req.params.comment_id,(err, foundComment)=>{
		if(err || !foundComment){
			flashMessageObj.throwNewError(req, res, 'Could not find comment');
		}else{
			res.render('comments/edit', {campground_id:req.params.id, comment:foundComment});
		}
	});
});
//=============================================
//UPDATE Route comments
router.put('/:comment_id', middlewareObj.checkCommentOwnership,(req,res)=>{
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment,(err, foundComment)=>{
		if(err || !foundComment){
			flashMessageObj.throwNewError(req, res, 'Could not update comment');
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
			flashMessageObj.errorCampgroundMessage(req,res,err);
		}else{
			foundComment.remove(err=>{
				if(err){
					flashMessageObj.errorCampgroundMessage(req,res,err);
				}else{
					req.flash('success','Deleted comment');
					res.redirect('/campgrounds/'+req.params.id);
				}
			});
			
		}
	});
});


module.exports = router;