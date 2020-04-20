const mongoose = require('mongoose');
const Comment = require('./comment');

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
	price:String
});

campGndSchema.pre('remove', async function(){
	try{
		await Comment.remove({
    		_id: {
    			$in: this.comments
    		}
    	});
	}catch(err){
    	throw new Error('remove failed');
    }
});

// variable to use mongoose functions also creates collection for campgrounds
module.exports = mongoose.model("Campground", campGndSchema);