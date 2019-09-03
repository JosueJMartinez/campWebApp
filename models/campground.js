const mongoose = require('mongoose');
const Comment = require('./comment');

//Schema setup
const campGndSchema = new mongoose.Schema({
	title: String,
	img: String,
	location: String,
	lat: Number,
	lng: Number,
	description: String,
	comments:[{
		type:mongoose.Schema.Types.ObjectId,
		ref:'Comment'
	}],
	author:{
		id:{
			type:mongoose.Schema.Types.ObjectId,
			ref:'User'
		},
		username: String
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