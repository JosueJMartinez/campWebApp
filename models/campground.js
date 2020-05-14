const 	mongoose = require('mongoose'),
		Comment = require('./comment'),
		Review = require('./review'),
	  	User = require('./user'),
	  	Notification = require('./notification'),
	  	TOOLS = require('../tools'),
	  	tools = new TOOLS();

//Schema setup nned to add storage for forecast!!
const campGndSchema = new mongoose.Schema({
	title: String,
	img: String,
	img_id: String,
	location: String,
	lat: Number,
	lng: Number,
	description: String,
	createdAt: { 
		type: Date, 
		default: Date.now 
	},
	comments:[{
		type:mongoose.Schema.Types.ObjectId,
		ref:'Comment'
	}],
	author:{
		type:mongoose.Schema.Types.ObjectId,
		ref:'User'
	},
	price:String,
	likes:[{
		type:mongoose.Schema.Types.ObjectId,
		ref:'User'
	}],
	reviews: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review'
    }],
    rating: {
        type: Number,
        default: 0
    },
	simple: String
});

campGndSchema.pre('remove', async function(){
	try{
		
		let cNote = await tools.findNotifications(this.comments, 'comment');
		let rNote = await tools.findNotifications(this.reviews, 'review');
		let campNote = await tools.findNotifications(this._id, 'campground');
		
		let newNotes = [...cNote, ...rNote, ...campNote].map(note=> note._id+'');
		
		await tools.pullUsersNotifications(newNotes);
		
		await Notification.remove({
			comment:{
				$in:this.comments
			}
		});
		
		await Comment.remove({
    		_id: {
    			$in: this.comments
    		}
    	});
		
		await Notification.remove({
			review:{
				$in:this.reviews
			}
		});
		
		await Review.remove({
			_id:{
				$in: this.reviews
			}
		});
		
		await Notification.remove({
			campground:{
				$in:this._id
			}
		});
		
	}catch(err){
    	throw err;
    }
});

// variable to use mongoose functions also creates collection for campgrounds
module.exports = mongoose.model("Campground", campGndSchema);