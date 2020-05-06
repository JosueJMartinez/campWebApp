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

		let notification = await Notification.create(newNotification);
		for(const follower of user.followers){
			follower.notifications.push(notification);
			await follower.save();
		}
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
}
module.exports = Tools;