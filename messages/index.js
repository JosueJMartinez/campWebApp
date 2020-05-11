var flashMessageObj = {};

//standard flash of error and back redirect 
flashMessageObj.errorCampgroundMessage=(req, res, err, navigation, data)=>{
    req.flash('error', err);
	if(data){
		return res.render(navigation, {data, form:true});
	}
	if(navigation){
		return res.redirect(navigation);
	}else{
		return res.redirect('back');	
	}
};

module.exports = flashMessageObj;