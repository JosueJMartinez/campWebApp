const 	mongoose = require('mongoose'),
		Comment = require('./comment'),
		Review = require('./review'),
	  	User = require('./user'),
	  	Notification = require('./notification');

//Schema setup
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
    }
});

campGndSchema.pre('remove', async function(){
	try{
		let cNote = await Notification.find({
			comment:{
				$in:this.comments
			}
		}).select('id').exec();
		
		let rNote = await Notification.find({
			review:{
				$in:this.reviews
			}
		}).select('id').exec();
		
		let campNote = await Notification.find({
			campground: this._id
		}).select('id').exec();
		
		let notifications = [...cNote, ...rNote, ...campNote];
		let newNotes = notifications.map(note => note._id+"");
		
		let users = await User.find({notifications:{$in:newNotes}});
		for(const user of users){
			
			user.notifications = user.notifications.filter(note=>{
				return !newNotes.includes(note.toString());
			});
			
			await user.save();
		};
		
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