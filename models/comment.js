const 	mongoose = require('mongoose'),
	  	User = require('./user'),
		Notification = require('./notification');

//Schema setup
const commentSchema = new mongoose.Schema({
	text: String,
	createdAt: { 
		type: Date, 
		default: Date.now 
	},
	author:{
		type: mongoose.Schema.Types.ObjectId,
		ref:'User'
	},
	campground:{
		type:mongoose.Schema.Types.ObjectId,
		ref:'Campground'
	}
	
});
commentSchema.pre('remove', async function(){
	try{
		let notes_ids = await Notification.find({
			comment:this._id
		}).select('id').exec();
		
		let users = await User.find({notifications:{$in:notes_ids}});
		notes_ids = notes_ids.map(note => note._id+"");
		for(const user of users){
			
			user.notifications = user.notifications.filter(note =>{
				return !notes_ids.includes(note.toString());
			});

			await user.save();
		};
		
		await Notification.remove({
			comment:this._id
		});
		
		await mongoose.model('Campground').findByIdAndUpdate(this.campground,{
			$pull:{
				comments:this._id
			}	
		});
		
	}catch(err){
		throw err;
	}
});
// variable to use mongoose functions also creates collection for campgrounds
module.exports = mongoose.model("Comment", commentSchema);