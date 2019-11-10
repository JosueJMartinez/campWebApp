const express = require('express'),
	router = express.Router(),
	Campground = require('../models/campground'),
	middlewareObj = require('../middleware'),
	flashMessageObj = require("../messages"),
	NodeGeocoder = require('node-geocoder');
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
	Campground.find({}, (err, campgrounds) => {
		if (err || !campgrounds) {
			flashMessageObj.throwNewError(req, res, 'Could not connect to campgrounds try again later');
		}
		else {
			res.render('campgrounds/index', { campgrounds: campgrounds, currentUser: req.user});
		}
	});
});

//=================================================================
//CREATE route - add new campgrounds to db
//post to add new campgrounds
router.post('/', middlewareObj.isLoggedIn, (req, res) => {
	//get data from form and add to camgrounds database
	//redirect back to campgrounds

	if (req.body.campground.price <= 0) {
		req.flash('error', 'Price of camp must be above 0');
		res.redirect('/campgrounds/new');
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
				console.log(err);
				req.flash('error', 'Invalid address');
				return res.redirect('back');
			}

			var campground = {
				title: req.body.campground.title,
				img: req.body.campground.img,
				description: req.body.campground.description,
				author: author,
				price: req.body.campground.price,
				lat: data[0].latitude,
				lng: data[0].longitude,
				location: data[0].formattedAddress
			};

			Campground.create(campground, (err, newCampground) => {
				if (err || !newCampground) {
					flashMessageObj.throwNewError(req, res, 'Could not create campground try if persists try again later');
				}
				else {
					req.flash('success', 'Added new campground');
					res.redirect('/campgrounds');
				}
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
			flashMessageObj.throwNewError(req, res, 'Could not find missing campground try again later if problem persists');
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
//UPDATE Route
router.put('/:id', middlewareObj.checkOwnership, (req, res) => {
	if (req.body.campground.price <= 0) {
		req.flash('error', 'Price is not above $0.00');
		res.redirect('/campgrounds/' + req.params.id + '/edit');
	}
	else {
		//steps made to get location for google maps and store it into database
		geocoder.geocode(req.body.campground.location, (err, data) => {
			
			if (err || !data.length) {
    			req.flash('error', 'Invalid address');
    			return res.redirect('back');
    		}
			req.body.campground.lat = data[0].latitude;
			req.body.campground.lng = data[0].longitude;
			req.body.campground.location = data[0].formattedAddress;
			
			Campground.findByIdAndUpdate(req.params.id, req.body.campground, (err, updateCampground) => {
				if (err || !updateCampground) {
					flashMessageObj.throwNewError(req, res, 'Could not update campground');
				}
				else {
					req.flash('success', 'Updated campground');
					res.redirect('/campgrounds/' + req.params.id);
				}
			});
		});
	}
});

//=========================================================
//DESTROY Route
router.delete('/:id', middlewareObj.checkOwnership, (req, res) => {
	Campground.findById(req.params.id, (err, foundCampground) => {
		if (err || !foundCampground) {
			flashMessageObj.throwNewError(req, res, 'Could not delete campground');
		}
		else {
			foundCampground.remove(err => {
				if (err) {
					flashMessageObj.errorCampgroundMessage(req, res, err);
				}
				else {
					req.flash('success', 'Deleted campground');
					res.redirect('/campgrounds');
				}
			});
		}
	});
});

module.exports = router;
