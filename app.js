//jshint esversion:6
//load modules
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//replace encryption with md5 haashing, and now with bcrypt and salt rounds
// const encrypt = require("mongoose-encryption");
// const md5=require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

//now using passport
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');


//using google oauth
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

//create express instance
const app = express();

//set up ejs and body parser;
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

//initialize express session
app.use(session({
  secret: process.env.SECRETSTRING,
  resave: false,
  saveUninitialized: false
}));

//initialize passport;
app.use(passport.initialize());
app.use(passport.session());

//connect mongoose to database
mongoose.connect("mongodb+srv://admin-christ:"+process.env.MONGOPW+"@cluster0.4ceok.mongodb.net/userDB", {useNewUrlParser:true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

//create schema for user logins
//use mongoose.Schema becuase we use mongoose methods on it later
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true},
  password: String,
  googleId: String,
  facebookId: String,
  secret: Array
});

//create secret string as "key" to encrypt/decrypt strings
//SECRET STRING moved to .env file
//the .plugin(encrypt) method must be done before creating the model
//because it passes the schema when creating the model
//encryptedFields allows us to select whcih field to encrypt
//use process.env to pull secret string from .env
// userSchema.plugin(encrypt, {secret: process.env.SECRETSTRING, encryptedFields: ['password']});

//now using passportLocalMongoose
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//create model using user schema;
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://arcane-journey-84492.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "https://arcane-journey-84492.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


//create get routes
app.get("/", function(req, res){
  res.render("home");
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req,res){
  User.find({"secret": {$ne:null}}, function(err,foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        console.log(foundUsers)
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  })
});

app.get("/submit", function (req,res){
  //check if user is authenticated;
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
})

app.post("/submit", function(req,res){
  const submittedSecret = req.body.secret;
  //find user submitting secret and add to their database document
  User.findById(req.user.id, function(err, foundUser){
    if (err){
      console.log(err);
    } else {
      if (foundUser){
        foundUser.secret.push(submittedSecret);
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
})

//create route to catch new user registration
app.post("/register", function(req,res){

  //using passport-local-mongoose
  User.register({username:req.body.username}, req.body.password, function(err,user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      })
    }
  })






  // bcrypt.hash(req.body.password, saltRounds, function(err, hash){
  //   //each registration creates new User model object
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: hash
  //   });
  //   //save user to db
  //     newUser.save(function(err){
  //       if(err){
  //         console.log(err);
  //       } else{
  //         res.render("secrets");
  //       }
  //     });
  // });
});

//create login route for users who have registered previously
app.post("/login", function(req,res){


  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  })








  // //check if user and password match db
  // const checkUser = req.body.username;
  // const checkPW = req.body.password;
  //
  // User.findOne({email:checkUser}, function(err,foundUser){
  //   if (err) {
  //     console.log(err);
  //   } else {
  //
  //   // if user is found in database, check if password matches, then render page
  //     if (foundUser){
  //       bcrypt.compare(checkPW, foundUser.password, function(err,result){
  //         if (result === true) {
  //           res.render("secrets");
  //         }
  //       })
  //     }
  //   }
  // });
});





//Start up server
app.listen(process.env.PORT, function(){
  console.log("server started");
});
