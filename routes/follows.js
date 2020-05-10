const   express     	= require('express'),
        router      	= express.Router(),
        User			= require('../models/user'),
        middlewareObj	= require('../middleware'),
        flashMessageObj = require('../messages'),
		TOOLS			= require('../tools'),
		tools			= new TOOLS(),
	  	Notification 	= require('../models/notification.js');


//========================================================================
//follow user route path	
//========================================================================
router.get('/:id', middlewareObj.isLoggedIn, async (req, res)=>{
	try{
		let user = await User.findById(req.params.id);
		user.followers.push(req.user._id);
		user.save();
		req.flash('success', 'Successfully followed '+ user.username+ '!');
		res.redirect('back');
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});
// working on removing a follower
router.get('/:id/unfollow', middlewareObj.isLoggedIn, async (req, res)=>{
	try{
		//need to find current user notifications
		let follower = await User.findById(req.user.id,{notifications:1}).populate('notifications');
		//find unfollowed user notifications
		//take out all unfollowed user notifications
		let array = [];
		let note;
		for(let i = 0; i < follower.notifications.length; i++){
			if(req.params.id == (follower.notifications[i].user+'')){
				note = follower.notifications.splice(i--,1);
				array.push(note[0]._id);
			}
		}
		await follower.save();
		
		//delete all notifications from current user that are the unfollowe
		await Notification.remove({
			_id:{
				$in:array
			}
		});
		
		await User.findByIdAndUpdate( req.params.id, { $pull: {followers: req.user.id } } );
		res.redirect('back');
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}

});

module.exports = router;