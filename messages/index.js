var flashMessageObj = {};

//standard flash of error and back redirect 
flashMessageObj.errorCampgroundMessage=(req, res, err, navigation)=>{
    req.flash('error', err.message);
	if(navigation){
		res.redirect(navigation);
	}else{
		res.redirect('back');	
	}
    
};

//creates a new error for user handling
flashMessageObj.throwNewError = (req, res, message, navigation)=>{
    try{
        throw new Error('error');
    }catch(err){
        err.message = message;
        flashMessageObj.errorCampgroundMessage(req, res, err, navigation);
    }
}

module.exports = flashMessageObj;