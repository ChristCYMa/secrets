//jshint esversion:6
//load modules
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

//create express instance
const app = express();

//set up ejs and body parser;
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

//connect mongoose to database
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true, useUnifiedTopology: true});

//create schema for user logins
//use mongoose.Schema becuase we use mongoose methods on it later
const userSchema = new mongoose.Schema({
  email: {
    type:String,
    required: [true, "Must include email"]
  },
  password: {
    type:String,
    required: [true, "Must include password"]
  }
});

//create secret string as "key" to encrypt/decrypt strings
//SECRET STRING moved to .env file
//the .plugin(encrypt) method must be done before creating the model
//because it passes the schema when creating the model
//encryptedFields allows us to select whcih field to encrypt
//use process.env to pull secret string from .env
userSchema.plugin(encrypt, {secret: process.env.SECRETSTRING, encryptedFields: ['password']});

//create model using user schema;
const User = new mongoose.model("User", userSchema);


//create get routes
app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

//create route to catch new user registration
app.post("/register", function(req,res){

  //each registration creates new User model object
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });

//save user to db
  newUser.save(function(err){
    if(err){
      console.log(err);
    } else{
      res.render("secrets");
    }
  });
});

//create login route for users who have registered previously
app.post("/login", function(req,res){

  //check if user and password match db
  const checkUser = req.body.username;
  const checkPW = req.body.password;

  User.findOne({email:checkUser}, function(err,foundUser){
    if (err) {
      console.log(err);
    } else {

    // if user is found in database, check if password matches, then render page
      if (foundUser){
        if (foundUser.password === checkPW){
          res.render("secrets");
        }
      }
    }
  });
});





//Start up server
app.listen(3000, function(){
  console.log("server started on port 3000");
});
