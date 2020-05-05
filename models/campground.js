const 	mongoose = require('mongoose'),
		Comment = require('./comment'),
		Review = require('./review');

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
            ref: "Review"
    }],
    rating: {
        type: Number,
        default: 0
    }
});

campGndSchema.pre('remove', async function(){
	try{
		await Comment.remove({
    		_id: {
    			$in: this.comments
    		}
    	});
		await Review.remove({
			_id:{
				$in: this.reviews
			}
		});
	}catch(err){
    	throw new Error('remove failed');
    }
});

// variable to use mongoose functions also creates collection for campgrounds
module.exports = mongoose.model("Campground", campGndSchema);