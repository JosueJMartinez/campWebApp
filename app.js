/*
	Things to do:
	1.	Update server side to check for valid inputs if client side javascript is turned off
	2.	Update sign up to have email and check if email is valid.
	3.	Need to check if email can be set up as a key in MongoDB like SQL, if can need re-structure DB
	4.	Need to work in AJAX to make site more responsive
	5.	Need to update images to be actual images saved in DB instead of URLs to images
	6.	Keep updating profile page for edits on information
	7.	Add a double check for password to make sure they input the correct password if they changed it or initial sign up
	8.	Update front-end GUI to be more presentable. Especially on mobile.
	9.	Update bootstrap from 3.3.7 to 4.3 this is in correlation with number 8
	10.	More features need to be added. Possible like buttons work in a search bar somehow.
	11.	Add REACT.js probably tied with 8 and 9
*/

require('dotenv').config();

const 	express 			= require('express'),
		app 				= express(),
		bodyParser 			= require('body-parser'),
		mongoose 			= require('mongoose'),
		User 				= require('./models/user'),
		seedDB 				= require('./seeds'),
		LocalStrategy 		= require('passport-local'),
		passport 			= require('passport'),
		methodOverride 		= require('method-override'),
		expressSanitizer 	= require('express-sanitizer'),
		flash 				= require('connect-flash');

//	passportLocalMongoose	= require('passport-local-mongoose'),
const 	commentRoutes 		= require('./routes/comments'),
		authRoutes 			= require('./routes/auth'),
		campRoutes 			= require('./routes/campgrounds'),
		middlewareObj 		= require('./middleware'),
		flashMessageObj 	= require('./messages');

//seedDB(); //script to seed database

//=============================================
//to use methodoverride for edit
app.use(methodOverride('_method'));

//==================================
//folder for various resources
app.use(express.static(__dirname + '/public'));
//==================================

//================================================
//set body parser
app.use(bodyParser.urlencoded({ extended: true }));
//================================================

//===================================================
//set up after body parser to sanitize code in text field
app.use(expressSanitizer());

//==================================
//folder for various resources
app.use(express.static('public'));
//==================================

//=============================================================
//not have to explicitly state these are ejs extension files
app.set('view engine', 'ejs');
//=============================================================

//===========================================================================
//required to add the moment package in the app to support time for posts
//===========================================================================
app.locals.moment = require('moment');

//======================================
//CONFIGURATION for PASSPORT AUTH
//===================================
app.use(
	require('express-session')({
		secret: process.env.SECRETWORD,
		resave: false,
		saveUninitialized: false
	})
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(flash());

//================================================
//set up to pass through user to ejs files
app.use((req, res, next) => {
	res.locals.currentUser = req.user;
	res.locals.error = req.flash('error');
	res.locals.success = req.flash('success');
	next();
});

//================================================================================================================
//connection to mongoDB and setup
mongoose
	.connect(
		`mongodb+srv://${process.env.USERMONGODB}:${process.env
			.PWMONGODB}@cluster0-jkann.mongodb.net/yelpcamp?retryWrites=true&w=majority`,
		{
			useNewUrlParser: true,
			useCreateIndex: true,
			useUnifiedTopology: true
		}
	)
	.then(() => {
		console.log('Connected to DB!');
	})
	.catch(err => {
		console.log('ERROR:', err.message);
	});

//================================================
//routes
app.use('/campgrounds', campRoutes);
app.use('/campgrounds/:id/comments', commentRoutes);
app.use('/', authRoutes);



//standard catch all route that does not exist
app.get('*', (req, res) => {
	res.send('page does not exist');
});

//server listens on here
app.listen(3000, process.env.IP, () => {
	console.log('YelpCamp App started on port: ' + process.env.PORT + ' at IP: ' + process.env.IP);
});