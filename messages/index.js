var flashMessageObj = {};

//standard flash of error and back redirect 
flashMessageObj.errorCampgroundMessage=(req, res, err)=>{
    console.log(err);
    req.flash('error', err.message);
    res.redirect('back');
};

//creates a new error for user handling
flashMessageObj.throwNewError = (req, res, message)=>{
    try{
        throw new Error('error');
    }catch(err){
        err.message = message;
        flashMessageObj.errorCampgroundMessage(req, res, err);
    }
}

module.exports = flashMessageObj;