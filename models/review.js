const mongoose 		=	require("mongoose"),
	TOOLS 			= 	require('../tools'),
	tools 			= 	new TOOLS();

const reviewSchema = new mongoose.Schema({
    //rating constrictions
	rating: {
        type: Number,
        required: "Please provide a rating (1-5 stars).",
        min: 1,
        max: 5,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer value."
        }
    },
    // review text
    text: {
        type: String
    },
    // author id and username fields
    author:{
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
    },
    // campground associated with the review
    campground: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campground"
    }
}, {
    // if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true
});

reviewSchema.pre('remove', async function(){
	try{
		let campground = await mongoose.model('Campground').findByIdAndUpdate(this.campground,{$pull:{reviews:this._id}},{new:true}).populate('reviews').exec();
		if(!campground){
			throw new Error('Could not find campground');
		}
		campground.rating = tools.calcAvg(campground.reviews);
		campground.save();
	}catch(err){
		throw err;
	}
});

module.exports = mongoose.model("Review", reviewSchema);