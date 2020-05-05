const mongoose = require('mongoose');

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
		eval(require('locus'));
		await mongoose.model('Campground').findByIdAndUpdate(this.campground,{
			$pull:{
					comments:this._id
				}	
			}, (err,foundCampground)=>{
			if(err){
				console.log(err);
				throw new Error('Could not find campground');
			}
		});
	}catch(err){
		throw new Error('Could not find Comment');
	}
});
// variable to use mongoose functions also creates collection for campgrounds
module.exports = mongoose.model("Comment", commentSchema);