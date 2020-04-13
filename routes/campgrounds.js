const express 		= 	require('express'),
	router 			= 	express.Router(),
	Campground 		= 	require('../models/campground'),
	middlewareObj 	= 	require('../middleware'),
	flashMessageObj = 	require("../messages"),
	TOOLS			= 	require('../tools'),
	tools			= 	new TOOLS(),
	NodeGeocoder 	= 	require('node-geocoder');
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
	//eval(require('locus'));
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
					res.render('campgrounds/index', { campgrounds: campgrounds, currentUser: req.user});	
				}
				
			}
		});
		
	}else{
		Campground.find({}, (err, campgrounds) => {
			if (err || !campgrounds) {
				flashMessageObj.errorCampgroundMessage(req, res, 'Could not connect to campgrounds try again later');
			}
			else {
				res.render('campgrounds/index', { campgrounds: campgrounds, currentUser: req.user});
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

	if (req.body.campground.price <= 0) {
		flashMessageObj.errorCampgroundMessage(req, res, 'Price of camp must be above 0', '/campgrounds/new');
	}
	else {
		var author = {
			id: req.user._id,
			username: req.user.username
		};
		//steps made to get location for google maps and store it into database
		geocoder.geocode(req.body.campground.location, (err, data) => {
			console.log(req.body.campground.location);
			console.log(data);
			//console.log(!data.length);
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
					author: author,
					price: req.body.campground.price,
					lat: data[0].latitude,
					lng: data[0].longitude,
					location: data[0].formattedAddress,
					img: result.secure_url,
					img_id: result.public_id
				};
				
				Campground.create(campground, (err, newCampground) => {
					if (err || !newCampground) {
						flashMessageObj.errorCampgroundMessage(req, res, 'Could not create campground try if persists try again later');
					}
					else {
						req.flash('success', 'Added new campground');
						res.redirect('/campgrounds/'+newCampground.id);
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
	res.render('campgrounds/new');
});

//==============================================================
//SHOW route - shows more info on a specific db collection item
//need to make sure this after the NEW route or it will activate this route first
router.get('/:id', (req, res) => {
	//find campground with provided ID
	//render show template with that campground
	Campground.findById(req.params.id).populate('comments').exec((err, foundCampground) => {
		if (err || !foundCampground) {
			flashMessageObj.errorCampgroundMessage(req, res, 'Could not find missing campground try again later if problem persists');
		}
		else {
			res.render('campgrounds/show', { campground: foundCampground });
		}
	});
});

//===================================================
//EDIT route 
router.get('/:id/edit', middlewareObj.checkOwnership, (req, res) => {
	Campground.findById(req.params.id, (err, foundCampground) => {
		res.render('campgrounds/edit', { campground: foundCampground });
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

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
