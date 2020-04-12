var flashMessageObj = {};

//standard flash of error and back redirect 
flashMessageObj.errorCampgroundMessage=(req, res, err, navigation)=>{
    req.flash('error', err);
	if(navigation){
		return res.redirect(navigation);
	}else{
		return res.redirect('back');	
	}
};

module.exports = flashMessageObj;