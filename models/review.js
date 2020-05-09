const mongoose 		=	require("mongoose"),
	TOOLS 			= 	require('../tools'),
	tools 			= 	new TOOLS(),
	User			=	require('./user'),
  	Notification	=	require('./notification');

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
		let notes_ids = await Notification.find({
			review:this._id
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
			review:this._id
		});
		
		let campground = await mongoose.model('Campground').findByIdAndUpdate(this.campground,{$pull:{reviews:this._id}},{new:true}).populate('reviews').exec();
		if(!campground){
			throw new Error('Could not find campground');
		}
		campground.rating = tools.calcAvg(campground.reviews);
		await campground.save();
		
	}catch(err){
		throw err;
	}
});

module.exports = mongoose.model("Review", reviewSchema);