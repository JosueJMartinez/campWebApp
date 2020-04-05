const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
	_userId: { 
		type: mongoose.Schema.Types.ObjectId, 
		required: true, 
		ref: 'User' 
	},
    token: { 
		type: String, 
		required: true 
	},
	createdAt: { 
		type: Date, 
		required: true, 
		default: Date.now, 
		index:{
			expires: 30
		}
	}
});

module.exports = mongoose.model("Token", tokenSchema);