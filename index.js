const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

mongoose.connect("mongodb://jagadeesh:pass123@ds337377.mlab.com:37377/jagadeesh-express-app",
{ useNewUrlParser : true },function(error){
    if(error){
        console.log(error);
    }else{
        console.log("connected to database")
    }
})

app.use(bodyParser.json());
app.listen(3000, () => console.log('Server started at port : 3000'));

const User = mongoose.model('User', {
    email : { type:String , required : true , unique : true ,
        match:/^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/ },
    password : { type:String , required : true, unique: false },
    otp : {type : String}
});

app.post('/user/signup', (req,res,next) => {
    User.find({email : req.body.email })
    .exec()
    .then(user => {
        if(user.length >= 1 ) {
            return res.status(409).json({
                message: 'mail already exists'
            });
        } else {
            const user = new User({
                email: req.body.email,
                password: req.body.password
                });
            try{
                const savedUser = user.save();
                res.json({message : 'user created'});
            } catch(err){
                res.json({message : err});
            }        
        }
    })
});
  
app.post("/user/login", (req, res, next) => {
    User.find({ email: req.body.email })
      .exec()
      .then(user => {
        if (user.length < 1) {
          return res.status(401).json({
            message: "Auth failed"
          });
        }
        if (req.body.password === user[0].password) {
            const token = jwt.sign(
                {
                  email: user[0].email,
                  userId: user[0]._id
                },
                process.env.JWT_KEY,{
                    expiresIn: "1h"
                });
              return res.status(200).json({
              message: "Auth successful",
              token : token
            });
          }else{
            return res.status(404).json({
                message: "Auth failed"
            });              
          }
        })
      .catch(err => {
        console.log(err);
        res.status(500).json({
          error: err
        });
      });
  });

app.delete('/user/delete/:id', async (req,res,next) =>{
    try{
        const removedUser = await User.remove({_id: req.params.id});
        res.json(removedUser);
    }catch(err){
        res.json({message : err});
    }
});

app.post('/user/reset-password', (req, res, next) => {
    User.find({ email: req.body.email })
      .exec()
      .then(user => {
        if (user.length < 1) {
          return res.status(401).json({
            message: "email doesnot exist"
          });
        }
        if (req.body.oldpassword === user[0].password) {
            user[0].password = req.body.newpassword;
            console.log(user[0].password);
            const resetpassword = user[0].save();
            return res.status(200).json({
              message: "password reset successful"
            });
          }else{
            return res.status(404).json({
                message: "password reset failed"
            });              
          }
        })
      .catch(err => {
        console.log(err);
        res.status(500).json({
          error: err
        });
      });
  });

  app.post('/user/forgot-password', (req, res, next) => {
    User.find({ email: req.body.email })
      .exec()
      .then(user => {
        if (user.length < 1) {
          return res.status(401).json({
            message: "email doesnot exist"
          });
        }
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            secure : false,
            post : 25,
            auth: {
              user: 'jagguappnew@gmail.com',
              pass: 'asdf@123'
            },
            tls: {
                rejectUnauthorized : false
            }
          });
          val = 'secret';
          let HelperOptions = {
            from: '"express-app" <jagguappnew@gmail.com',
            to: req.body.email,
            subject: 'your recovery otp',
            text: val 
          };
          
          transporter.sendMail(HelperOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });

          user[0].otp = val;
          const sentotp = user[0].save();

        })
      .catch(err => {
        console.log(err);
        res.status(500).json({
          error: err
        });
      });
  });

app.post('/user/reset-forgot-password', (req, res, next) => {
    User.find({ email: req.body.email })
      .exec()
      .then(user => {
        if (user.length < 1) {
          return res.status(401).json({
            message: "email doesnot exist"
          });
        }
        if (req.body.otp === user[0].otp) {
            user[0].password = req.body.password;
            console.log(user[0].password);
            const resetpassword = user[0].save();
            return res.status(200).json({
              message: "password reset successful"
            });
          }else{
            return res.status(404).json({
                message: "password reset failed"
            });              
          }
        })
      .catch(err => {
        console.log(err);
        res.status(500).json({
          error: err
        });
      });
  });
