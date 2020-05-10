const 	mongoose		= require('mongoose'),
	  	TOOLS 			= require('../tools'),
		tools 			= new TOOLS(),
	  	User 			= require('./user'),
		Notification 	= require('./notification');

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
		let notes_ids = await tools.findNotifications(this._id, 'comment');
		notes_ids = notes_ids.map(note => note._id+"");
		
		await tools.pullUsersNotifications(notes_ids);
		
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