const express = require("express");
const bodyParser = require("body-parser");
const ConnectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const multer  = require('multer');
const path = require('path');
const passport = require("passport");
const findOrCreate = require('mongoose-findorcreate');
const methodOverride = require('method-override');
const fs = require('fs');
const PasportLocalMongoose = require("passport-local-mongoose");
const port =8080;

//database
const mongoDB = "mongodb://127.0.0.1/unique";
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
  email: String,
  password: String, 
});

UserSchema.plugin(PasportLocalMongoose);
UserSchema.plugin(findOrCreate);
const User = mongoose.model("User", UserSchema);

const userData = new mongoose.Schema({
  _id: String,
  Fname: String,
  Lname: String,
  SocialLinks: {
    facebook: {
      type: String,
    },
    instagram: {
      type: String,
    },
    twitter: {
      type: String,
    },
    github: {
      type: String,
    },
    quora: {
      type: String,
    },
  },
  img:
    {
        data: Buffer,
        contentType: String
    },
  Bio: String,
  lookingForJob: Boolean,
  posts:String ,
});

const Data = mongoose.model("Data", userData);

const app = express();

// Configure Sessions Middleware
app.use(
  session({
    secret: "r8q,+&1LM3)CD*zAGpx1xm{NeQhc;#",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 hour
  })
);

// Configure Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, 'public'))); //  "public" off of current is root

app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'))

// Passport Local Strategy
passport.use(User.createStrategy());

// To use with sessions
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


 



app.get("/", (req, res) => {
  if (req.user) {
    res.redirect("/final");
  } else {
    res.render("home");
  }
});



 





app.get("/final", (req, res) => {
  if (req.user) {
    Data.find({ _id: { $in: req.user._id } }, (err, docs) => {
      if (err) {
        res.send(err);
      } else {   
        res.render("final", { bol: docs, id_:req.user._id});
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/dashboard", ConnectEnsureLogin.ensureLoggedIn(), (req, res) => {
  res.render("dashboard", { t: req.user.username });
});


/////image upload

const storage = multer.diskStorage({
  destination:(req, file, cb) => {
    cb(null, "images")
  },
  filename: (req,file, cb) => {
    console.log(file);
    cb(null, Date.now() + path.extname(file.originalname))
  }
}) ;



const upload = multer({storage:storage});


app.post("/dashboard", upload.single("image"),(req, res) => {
  const data1 = new Data({
    _id: req.user._id,
    Fname: req.body.fname,
    Lname: req.body.lname,
    SocialLinks: {
      facebook: req.body.fb,
      instagram: req.body.insta,
      twitter: req.body.twitter,
      github: req.body.git,
      quora: req.body.quora,
    },
    img: {
      data: fs.readFileSync(path.join(__dirname + '/images/' + req.file.filename)),
      contentType: 'image/png'
  },
    Bio: req.body.bio,
    lookingForJob: true,
    posts:req.body.myPost
  });
  Data.findOne({ _id: req.user._id }, (err, foundId) => {
    if (err) {
      console.log(err);
    } else {
      if (foundId) {
        console.log("This Person already Exist");
        res.redirect("/login");
      } else {
        Data.create(data1, (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log("successfully added to Data");
            res.redirect("/final");
          }
        });
      }
    }
  });
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.redirect("/");
    }

    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }

      return res.redirect("/final");
    });
  })(req, res, next);
});

app.get("/login", (req, res) => {
  if (req.user) {
    res.redirect("/final");
  } else {
    res.render("login");
  }
});

app.get("/register", (req, res) => {
  if (req.user) {
    res.redirect("/final");
  } else {
    res.render("register");
  }
});

app.post("/register", (req, res) => {
  User.findOne({ username: req.body.username }, (err, foundUser) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      if (foundUser) {
        res.redirect("/login");
      } else {
        User.register(
          { username: req.body.username, active: false },
          req.body.password,
          (err, user) => {
            if (err) {
              console.log(err);
            } else {
              passport.authenticate("local", {
                successRedirect: "/dashboard",
                failureRedirect: "/",
              })(req, res, function (err, success) {
                if (err) {
                  console.log(err);
                  res.redirect("/login");
                } else {
                  res.redirect("/final");
                }
              });
            }
          }
        );
      }
    }
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});








app.route('/user/:id')
.get((req,res) => {
  Data.findOne(
    {_id:req.params.id},
    (err, found)=>{
      if(err){
        console.log(err);
      }else{
         
        res.render('update', {went:found})
      }
    }
    )
})
.put((req,res) => {
   
  Data.updateOne(
    {_id: req.params.id},
    {
      Fname: req.body.fname,
    Lname: req.body.lname,
    SocialLinks: {
      facebook: req.body.fb,
      instagram: req.body.insta,
      twitter: req.body.twitter,
      github: req.body.git,
      quora: req.body.quora,
    }, 
    Bio: req.body.bio,
    lookingForJob: true,
    },
    (err) => {
      if(err){
        console.log(err);
      }else{
        console.log('WOW');
        res.redirect('/final')
      }
    }
  ) 
}) 





app.get('/post/:id', (req,res) => {
Data.find({_id:req.params.id}, (err, hasFound)=> {
  if(err){
    res.send(err)
  }else
  { 
    hasFound.forEach((e) => {
      console.log(e);
      res.render('feed');
    });
  }
})
});
















 
app.listen(port, () => {
  console.log("Running on port " + port);
});
