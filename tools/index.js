const 	flashMessageObj = require('../messages'),
		Notification =		require('../models/notification'),
		User =				require('../models/user');
//set up by default for objects to be compared if they are empty
var Tools = function(){
	
}
//check if object is empty
Tools.prototype.isEmpty = function(OBJ) {
	for (var key in OBJ) {
		if (OBJ.hasOwnProperty(key)) return false;
	}
	return true;
};

//merge obj2(src) values into obj1(dest) 
Tools.prototype.mergeProp = function(obj1, obj2) { //obj1 is destination, obj2 is source
  for (var a in obj2) {
      obj1[a] = obj2[a];  
  }
  return obj1 //returns {a: 1, b: 4, c: 3, d: 4} should have {...b: 2...}
}

Tools.prototype.calcAvg = (reviews) => {
	if(reviews.length===0){
		return 0;
	}
	var sum = 0;
	reviews.forEach(review=>{
		sum += review.rating;
	});
	return sum/reviews.length;
}
// main function to add notifications for users ex: 
// addNotification({user: user._id, campground||comment||review: obj._id})
Tools.prototype.addNotification = async (obj)=> {
	try{
		let user = await User.findById(obj.user).populate('followers').exec();
		let newNotification ={
				user:obj.user
		}
		if(obj.campground){
			newNotification.campground = obj.campground;
		}else if(obj.comment){
			newNotification.comment = obj.comment;
		}else{
			newNotification.review = obj.review
		}

		// eval(require('locus'));
		for(const follower of user.followers){
			let notification = await Notification.create(newNotification);
			// eval(require('locus'));
			follower.notifications.push(notification);
			// eval(require('locus'));
			await follower.save();
			// eval(require('locus'));
		}
		// eval(require('locus'));
	}catch(err){
		throw err;
	}
}

//passes in an object field array and type, and returns a list of notifications ids 
//that are that type;
Tools.prototype.findNotifications = async (list, type) =>{
	try{
		let notes =  await Notification.find({
			[type]:{
				$in:list
			}
		}).select('_id').exec();
		return notes;
	}catch(err){
		throw err;
	}
}
//sends in an array of notifications, finds users being notified and 
//pulls out the notifications from the user notifications field array
Tools.prototype.pullUsersNotifications = async(notes) =>{
	try{
		let users = await User.find({notifications:{$in:notes}});
		for(const user of users){

			user.notifications = user.notifications.filter(note=>{
				return !notes.includes(note.toString());
			});

			await user.save();
		};
	}catch(err){
		throw err;
	}
}

module.exports = Tools;