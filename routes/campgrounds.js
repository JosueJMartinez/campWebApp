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
router.get('/', (req, res) => {
	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		Campground.find({title: regex}, (err, campgrounds) => {
			if (err || !campgrounds) {
				flashMessageObj.errorCampgroundMessage(req, res, 'Could not connect to campgrounds try again later');
			}
			else {
				if(campgrounds.length < 1){
					flashMessageObj.errorCampgroundMessage(req, res, 'Could not find any campgrounds please search again','/campgrounds');
				}else{
					res.render('campgrounds/index', { campgrounds: campgrounds, currentUser: req.user, page:'campgrounds'});	
				}
				
			}
		});
		
	}else{
		Campground.find({}).populate('author').exec((err, campgrounds) => {
			if (err || !campgrounds) {
				flashMessageObj.errorCampgroundMessage(req, res, 'Could not connect to campgrounds try again later');
			}
			else {
				//console.log(campgrounds);
				// eval(require('locus'));
			
				res.render('campgrounds/index', { campgrounds: campgrounds, currentUser: req.user, page:'campgrounds'});
			}
		});
	}
	
});

//=================================================================
//CREATE route - add new campgrounds to db
//post to add new campgrounds
router.post('/', middlewareObj.isLoggedIn, uploadFile, (req, res) => {
	//get data from form and add to camgrounds database
	//redirect back to campgrounds
	//eval(require('locus'));
	if (req.body.campground.price <= 0) {
		flashMessageObj.errorCampgroundMessage(req, res, 'Price of camp must be above 0', '/campgrounds/new');
	}
	else {
		//steps made to get location for google maps and store it into database
		geocoder.geocode(req.body.campground.location, (err, data) => {
			// 	console.log(req.body.campground.location);
			// 	console.log(data);
			//	console.log(!data.length);
			if (err || !data.length) {
				flashMessageObj.errorCampgroundMessage(req, res, 'Invalid Address');
			}
			
			cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
				if(err){
					return flashMessageObj.errorCampgroundMessage(req, res, err.message);
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
					img_id: result.public_id
				};
				
				Campground.create(campground, async (err, newCampground) => {
					if (err || !newCampground) {
						flashMessageObj.errorCampgroundMessage(req, res, 'Could not create campground try if persists try again later');
					}
					else {
						try{
							let user = await User.findById(req.user._id).populate('followers').exec();
							let newNotification = {
								user: req.user._id,
								campground: newCampground._id
							}
//====================================================================
//New code added for notifications go through user followers and push 
//notification to let them campground was creater
//====================================================================
							let notification = await Notification.create(newNotification);
							for(const follower of user.followers) {
								
								follower.notifications.push(notification);
								follower.save();
							}
							//redirect back to campgrounds page
							req.flash('success', 'Added new campground');
							res.redirect(`/campgrounds/${newCampground._id}`);
						} catch(err) {
							flashMessageObj.errorCampgroundMessage(req, res, err.message);
						}
						
					}
				});
			});
		});
	}
});

//=====================================================
//NEW Route - show form to create new campgrounds
//form used to add new campgrounds
router.get('/new', middlewareObj.isLoggedIn, (req, res) => {
	res.render('campgrounds/new', {form:true});
});

//==============================================================
//SHOW route - shows more info on a specific db collection item
//need to make sure this after the NEW route or it will activate this route first
router.get('/:id', (req, res) => {
	//find campground with provided ID
	//render show template with that campground
	Campground.findById(req.params.id).populate('author likes').populate({path:'comments',populate:{path:'author'}}).exec(async (err, foundCampground) => {
		if (err || !foundCampground) {
			flashMessageObj.errorCampgroundMessage(req, res, 'Could not find missing campground try again later if problem persists');
		}
		else {
			//im working right here
			let isFollower = false;
			if(req.user){
				for(const follower of foundCampground.author.followers){
					if(req.user.id == follower){
						isFollower = true;
						break;
					}
				}
			}
			
			console.log(foundCampground.author.followers, isFollower);
			res.render('campgrounds/show', { campground: foundCampground, page:'show', isFollower });
		}
	});
});

//===================================================
//EDIT route 
router.get('/:id/edit', middlewareObj.checkOwnership, (req, res) => {
	Campground.findById(req.params.id, (err, foundCampground) => {
		res.render('campgrounds/edit', { campground: foundCampground, form:true });
	});
});

//======================================================
//UPDATE Route something is wrong here where I am not passing variables.
router.put('/:id', middlewareObj.checkOwnership, uploadFile, (req, res) => {
	if (req.body.campground.price <= 0) {
		return flashMessageObj.errorCampgroundMessage(req, res, 'Price is not above $0.00', '/campgrounds/' + req.params.id + '/edit');
	}
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
					await cloudinary.v2.uploader.destroy(updateCampground.img_id);
					let result = await cloudinary.v2.uploader.upload(req.file.path);
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
router.delete('/:id', middlewareObj.checkOwnership, (req, res) => {
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
router.post('/:id/like', middlewareObj.isLoggedIn, async (req, res)=>{
	try{
		console.log('test');
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
