const express 		= 	require('express'),
	router 			= 	express.Router(),
	Campground 		= 	require('../models/campground'),
	Comment			= 	require('../models/comment'),
	middlewareObj 	= 	require('../middleware'),
	flashMessageObj = 	require("../messages"),
	TOOLS			= 	require('../tools'),
	tools			= 	new TOOLS(),
	NodeGeocoder 	= 	require('node-geocoder'),
	User 			= 	require('../models/user'),
  	Notification	=	require('../models/notification');
//=============================================
// Setup for uploading images to webApp
//=============================================
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter}).single('image');
function uploadFile(req, res, next){
	upload(req, res, err =>{
		if(err){
			return flashMessageObj.errorCampgroundMessage(req, res, err.message);
		}
		next();
	});
}

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'josuemartinez', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});
//=========================================================
//setup for geocoder
var options = {
	provider: 'google',
	httpAdapter: 'https',
	apiKey: process.env.GEOCODER_API_KEY,
	formatter: null
};

var geocoder = NodeGeocoder(options);

//===============================================================
//INDEX route - show all campgrounds
//campgrounds page
router.get('/', middlewareObj.isVerified, (req, res) => {
	let perPage = 6,
	pageQuery = parseInt(req.query.page),
	pageNumber = pageQuery ? pageQuery : 1;
	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		Campground.find({title: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).populate('author').exec( async (err, campgrounds) => {
			if(campgrounds.length < 1){
					return flashMessageObj.errorCampgroundMessage(req, res, `Could not find any campgrounds by the name of ${req.query.search}`,'/campgrounds');
				}
			if (err || !campgrounds) {
				flashMessageObj.errorCampgroundMessage(req, res, 'Could not connect to campgrounds try again later');
			}
			else {
				try{
					if(campgrounds.length < 1){
					 	return flashMessageObj.errorCampgroundMessage(req, res, 'Could not find any campgrounds please search again','/campgrounds'); 
					}
					
					let count = await Campground.countDocuments({title: regex}).exec();
					let pages =  Math.ceil(count/perPage);
					
					if(pageQuery>pages){
						return flashMessageObj.errorCampgroundMessage(req, res, 'Went beyond the last index page', '/campgrounds');
					}
					
					return res.render('campgrounds/index', { campgrounds: campgrounds, currentUser: req.user, page:'campgrounds', current:pageNumber, pages, search: req.query.search});
				}catch(err){
					return flashMessageObj.errorCampgroundMessage(req, res, err.message);
				}
			}
		});
		
	}else{
		
		Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).populate('author').exec(async (err, campgrounds) => {
			if (err || !campgrounds) {
				flashMessageObj.errorCampgroundMessage(req, res, 'Could not connect to campgrounds try again later');
			}
			else {
				try{
					let count = await Campground.countDocuments({}).exec();
					
					let pages =  Math.ceil(count/perPage);
					
					if(pageQuery>pages){
						return flashMessageObj.errorCampgroundMessage(req, res, 'Went beyond the last index page','/campgrounds');
					}
					
					res.render('campgrounds/index', { campgrounds: campgrounds, currentUser: req.user, page:'campgrounds', current:pageNumber, pages, search: false});
				}catch(err){
					flashMessageObj.errorCampgroundMessage(req, res, 'Something went wrong with the page counter');
				}
				
			}
		});
	}
	
});

//=================================================================
//CREATE route - add new campgrounds to db
//post to add new campgrounds
router.post('/', middlewareObj.isLoggedIn, middlewareObj.isVerified, uploadFile, (req, res) => {
	//get data from form and add to camgrounds database
	//redirect back to campgrounds
	//eval(require('locus'));
	if (req.body.campground.price <= 0) {
		flashMessageObj.errorCampgroundMessage(req, res, 'Price of camp must be above 0', '/campgrounds/new');
	}
	else {
		//steps made to get location for google maps and store it into database
		geocoder.geocode(req.body.campground.location, (err, data) => {
			if (err || !data.length) {
				flashMessageObj.errorCampgroundMessage(req, res, 'Invalid Address');
			}
			
			cloudinary.v2.uploader.upload(req.file.path, {moderation: "aws_rek"},function(err, result) {
				if(err){
					return flashMessageObj.errorCampgroundMessage(req, res, err.message);
				}
				//adding location weather here!!!
				if(result.moderation[0].status==='rejected'){
					return flashMessageObj.errorCampgroundMessage(req, res, 'Image is explicit', '/campgrounds/new');
				}
				var campground = {
					title: req.body.campground.title,
					description: req.body.campground.description,
					author: req.user.id,
					price: req.body.campground.price,
					lat: data[0].latitude,
					lng: data[0].longitude,
					location: data[0].formattedAddress,
					img: result.secure_url,
					img_id: result.public_id,
					simple: req.body.campground.simple
				};
				
				Campground.create(campground, async (err, newCampground) => {
					if (err || !newCampground) {
						flashMessageObj.errorCampgroundMessage(req, res, 'Could not create campground try if persists try again later');
					}
					else {
						tools.addNotification({user:req.user._id, campground: newCampground._id});
						req.flash('success', 'Added new campground');
						res.redirect(`/campgrounds/${newCampground._id}`);
					}
				});
			});
		});
	}
});

//=====================================================
//NEW Route - show form to create new campgrounds
//form used to add new campgrounds
router.get('/new', middlewareObj.isLoggedIn, middlewareObj.isVerified, (req, res) => {
	res.render('campgrounds/new', {form:true});
});

//==============================================================
//SHOW route - shows more info on a specific db collection item
//need to make sure this after the NEW route or it will activate this route first
router.get('/:id', middlewareObj.isVerified, (req, res) => {
	//find campground with provided ID
	//render show template with that campground
	Campground.findById(req.params.id).populate('author likes')
		.populate({path: 'reviews', options:{sort:{createdAt: -1}}, 
				   populate:{path: 'author', select: 'username'}})
		.populate({path: 'comments', options:{sort:{createdAt: -1}},populate:{path: 'author'}})
		.exec(async (err, foundCampground) => {
		
		if (err || !foundCampground) {
			flashMessageObj.errorCampgroundMessage(req, res, 'Could not find missing campground try again later if problem persists');
		}
		else {
			let isFollower = false;
			let userReview;
			
			if(req.user){
				for(const follower of foundCampground.author.followers){
					if(req.user.id == follower){
						isFollower = true;
						break;
					}
				}
				for(let i = 0; i < foundCampground.reviews.length; i++){
					if( req.user.id == foundCampground.reviews[i].author._id+''){
						userReview = foundCampground.reviews.splice(i, 1);
						break;
					}
				}
			}
			res.render('campgrounds/show', { campground: foundCampground, page:'show', isFollower, userReview});
		}
	});
});

//===================================================
//EDIT route 
router.get('/:id/edit', middlewareObj.isVerified, middlewareObj.checkOwnership, (req, res) => {
	Campground.findById(req.params.id, (err, foundCampground) => {
		res.render('campgrounds/edit', { campground: foundCampground, form:true });
	});
});

//=========================================================================
//UPDATE Route something is wrong here where I am not passing variables.
router.put('/:id', middlewareObj.isVerified, middlewareObj.checkOwnership, uploadFile, (req, res) => {
	if (req.body.campground.price <= 0) {
		return flashMessageObj.errorCampgroundMessage(req, res, 'Price is not above $0.00', '/campgrounds/' + req.params.id + '/edit');
	}
	//just in case for data manipulation
	delete req.body.campground.rating;
	geocoder.geocode(req.body.campground.location, (err, data) => {
		if (err || !data.length) {
			return flashMessageObj.errorCampgroundMessage(req, res, 'Invalid address.');
		}
		req.body.campground.lat = data[0].latitude;
		req.body.campground.lng = data[0].longitude;
		req.body.campground.location = data[0].formattedAddress;

		Campground.findById(req.params.id, async (err, updateCampground) => {
			if (err || !updateCampground) {
				return flashMessageObj.errorCampgroundMessage(req, res, 'Could not update campground');
			}
			if(req.file){
				//delete image if new one is uploaded and then upload new one to cloudinary
				try{
					let result = await cloudinary.v2.uploader.upload(req.file.path, {moderation: "aws_rek"});
					if(result.moderation[0].status==='rejected'){
						return flashMessageObj.errorCampgroundMessage(req, res, 'Image is explicit', `/campgrounds/${req.params.id}/edit`);
					}
					
					await cloudinary.v2.uploader.destroy(updateCampground.img_id);
					
					req.body.campground.img = result.secure_url;
					req.body.campground.img_id = result.public_id;
				}catch(err){
					return flashMessageObj.errorCampgroundMessage(req, res, 'Could not find or update try again later.');
				}
				
			}
			
			updateCampground = tools.mergeProp(updateCampground, req.body.campground);
			updateCampground.save();
			req.flash('success', 'Successfully updated!');
			res.redirect('/campgrounds/'+updateCampground._id);
		});
	});
});

//=========================================================
//DESTROY Route
router.delete('/:id', middlewareObj.isVerified, middlewareObj.checkOwnership, (req, res) => {
	Campground.findById(req.params.id, async (err, foundCampground) => {
		if (err || !foundCampground) {
			return flashMessageObj.errorCampgroundMessage(req, res, 'Could not delete campground');
		}
		try{
			//delete image from cloudinary
			await cloudinary.v2.uploader.destroy(foundCampground.img_id);
		}catch(err){
			return flashMessageObj.errorCampgroundMessage(req, res, err.message);
		}
		foundCampground.remove(err => {
			if (err) {
				return flashMessageObj.errorCampgroundMessage(req, res, err.message);
			}
			else {
				req.flash('success', 'Deleted campground');
				res.redirect('/campgrounds');
			}
		});
		
	});
});

//============================================================
//Routes for Likes buttons
//============================================================
router.post('/:id/like', middlewareObj.isLoggedIn, middlewareObj.isVerified, async (req, res)=>{
	try{
		
		let campground = await Campground.findById(req.params.id);
		let foundUserLike = campground.likes.some(like =>{
			return like.equals(req.user._id);
		});
		
		if(foundUserLike){
			campground.likes.pull(req.user.id);
		}else{
			req.flash('success','Post has been liked');
			campground.likes.push(req.user.id);
		}
		campground.save();
		res.redirect('back');
	}catch(err){
		flashMessageObj.errorCampgroundMessage(req, res, err.message);
	}
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;