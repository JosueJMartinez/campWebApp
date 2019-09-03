const mongoose = require('mongoose');
const Campground = require('./models/campground');
const Comment = require('./models/comment');

var data = [{
    title: 'Foggy Campground',
    img: 'https://images.unsplash.com/photo-1533873984035-25970ab07461?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1353&q=80',
    description: '"But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness. No one rejects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful. Nor again is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain, but because occasionally circumstances occur in which toil and pain can procure him some great pleasure. To take a trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it? But who has any right to find fault with a man who chooses to enjoy a pleasure that has no annoying consequences, or one who avoids a pain that produces no resultant pleasure?"'
}, {
    title: 'Campfire',
    img: 'https://images.unsplash.com/photo-1512524961050-aa85956b2b1f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1489&q=80',
    description: '"But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness. No one rejects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful. Nor again is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain, but because occasionally circumstances occur in which toil and pain can procure him some great pleasure. To take a trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it? But who has any right to find fault with a man who chooses to enjoy a pleasure that has no annoying consequences, or one who avoids a pain that produces no resultant pleasure?"'
}, {
    title: 'River of rocks',
    img: 'https://images.unsplash.com/photo-1477581265664-b1e27c6731a7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60',
    description: '"But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness. No one rejects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful. Nor again is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain, but because occasionally circumstances occur in which toil and pain can procure him some great pleasure. To take a trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it? But who has any right to find fault with a man who chooses to enjoy a pleasure that has no annoying consequences, or one who avoids a pain that produces no resultant pleasure?"'
}]

//function used to remove campgrounds from database
function seedDB() {
    Campground.remove({}, (err) => {
        if (err) {
            console.log(err);
        }/**
        else {
            console.log('removed Campgrounds');
            removeComments();
        }*/
    });
}

function removeComments(){
    Comment.remove({},err=>{
        if (err) {
            console.log(err);
        }
        else {
            console.log('removed comments');
            newSeeds();
        }
    });
}
function newSeeds() {
    var ctr = 0;
    data.forEach(seed => {
        Campground.create(seed, (err, newCampground) => {
            if (err) {
                console.log(err);
            }
            else {
                
                //create comment on each campground
                ctr++;
                //commentSeed(newCampground, ctr);
            }
        });
    });
}

function commentSeed(newCampground, ctr) {
    Comment.create({
        text: 'This is an awesome place, but i wish there was internet somewhere. No tv and no beer make homer go crazy '+ctr,
        author: 'Homer Simpson'
    }, (err, newComment) => {
        if (err) {
            console.log(err);
        }
        else {
            
            newCampground.comments.push(newComment);
            newCampground.save();
            

        }
    });
}

module.exports = seedDB;

//add a few campgrounds



//add a few comments
