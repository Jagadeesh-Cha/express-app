const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const AWS = require('aws-sdk');
const multers3 = require('multer-s3');


mongoose.connect("mongodb://jagadeesh:pass123@ds337377.mlab.com:37377/jagadeesh-express-app", {
  useNewUrlParser: true
}, function (error) {
  if (error) {
    console.log(error);
  } else {
    console.log("connected to database")
  }
})

app.use(bodyParser.json());
app.listen(3000, () => console.log('Server started at port : 3000'));

const User = mongoose.model('User', {
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/
  },
  password: {
    type: String,
    required: true,
    unique: false
  },
  otp: {
    type: String
  },
  s3bucket: {
    type: String
  }
});

app.post('/user/image-upload',
  async (req, res, next) => {

    const token = req.headers.authorization;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userEmail = decoded.email;
    User.find({
        email: userEmail
      })
      .exec()
      .then(user => {
        try {
          AWS.config.setPromisesDependency();
          AWS.config.update({
            accessKeyId: '',
            secretAccessKey: '',
            region: 'ap-south-1'
          });
          const s3 = new AWS.S3();
          const upload = multer({
            storage: multers3({
              s3,
              bucket: user[0].s3bucket,
              acl: 'public-read',
              metadata: function (req, file, cb) {
                cb(null, {
                  fieldName: 'TESTING_META_DATA!'
                });
              },
              key: function (req, file, cb) {
                cb(null, Date.now().toString())
              }
            })
          });
          const singleUpload = upload.single('image');
          singleUpload(req, res, function (err) {
            if (err) {
              return res.status(422).send({
                errors: [{
                  title: 'File Upload Error',
                  detail: err.message
                }]
              });
            }
            return res.json({
              'imageUrl': req.file.location
            });
          });
        } catch (err) {
          console.log('error is :', err)
        }
      });
  });
app.get('/user/images/get',
  (req, res, next) => {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userEmail = decoded.email;
    User.find({
        email: userEmail
      })
      .exec()
      .then(user => {
        try {
          AWS.config.update({
            accessKeyId: '',
            secretAccessKey: '',
            region: 'ap-south-1'
          });
          const s3 = new AWS.S3();
          const params = {
            Bucket: user[0].s3bucket
          }
          s3.listObjects(params, function (err, data) {
            if (err) throw err;
            return res.json({
              'list': data
            });
          });
        } catch (err) {
          console.log('error is :', err)
        }
      });
  });
app.delete('/user/images/delete',
  (req, res, next) => {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const userEmail = decoded.email;
    User.find({
        email: userEmail
      })
      .exec()
      .then(user => {
        try {
          AWS.config.update({
            accessKeyId: '',
            secretAccessKey: '',
            region: 'ap-south-1'
          });
          const s3 = new AWS.S3();
          var params = {
            Bucket: user[0].s3bucket,
            Delete: {
              Objects: [{
                Key: req.headers.accept
              }],
            },
          };
          s3.deleteObjects(params, function (err, data) {
            if (err) console.log(err, err.stack);
            return res.json(data);
          });
        } catch (err) {
          console.log('error is :', err)
        }
      });
  });

app.post('/user/signup', (req, res, next) => {
  User.find({
      email: req.body.email
    })
    .exec()
    .then(user => {
      if (user.length >= 1) {
        return res.status(409).json({
          message: 'mail already exists'
        });
      } else {
        const user = new User({
          email: req.body.email,
          password: req.body.password,
          s3bucket: req.body.s3bucket
        });
        try {
          const savedUser = user.save();
          AWS.config.update({
            accessKeyId: '',
            secretAccessKey: '',
            region: 'ap-south-1'
          });
          const s3 = new AWS.S3();
          const params = {
            Bucket: user.s3bucket
          };
          s3.createBucket(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else console.log("bucket created");
          });
          res.json({
            message: 'user created'
          });
        } catch (err) {
          res.json({
            message: err
          });
        }
      }
    })
});


app.post("/user/login", (req, res, next) => {
  User.find({
      email: req.body.email
    })
    .exec()
    .then(user => {
      if (user.length < 1) {
        return res.status(401).json({
          message: "Auth failed"
        });
      }
      if (req.body.password === user[0].password) {
        const token = jwt.sign({
            email: user[0].email,
            userId: user[0]._id
          },
          process.env.JWT_KEY, {
            expiresIn: "1h"
          });
        return res.status(200).json({
          message: "Auth successful",
          token: token
        });
      } else {
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

app.delete('/user/delete/:id', (req, res, next) => {
  User.findById({
      _id: req.params.id
    })
    .exec()
    .then(user => {
      AWS.config.update({
        accessKeyId: '',
        secretAccessKey: '',
        region: 'ap-south-1'
      });
      const s3 = new AWS.S3();
      const params = {
        Bucket: user.s3bucket
      };
      s3.deleteBucket(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else console.log("bucket deleted");
      });
      const removedUser = User.remove({
        _id: req.params.id
      });
      res.json(removedUser);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: err
      });
    });
});

app.post('/user/reset-password', (req, res, next) => {
  User.find({
      email: req.body.email
    })
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
      } else {
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
  User.find({
      email: req.body.email
    })
    .exec()
    .then(user => {
      if (user.length < 1) {
        return res.status(401).json({
          message: "email doesnot exist"
        });
      }
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        secure: false,
        post: 25,
        auth: {
          user: 'jagguappnew@gmail.com',
          pass: 'asdf@123'
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      val = 'secret';
      let HelperOptions = {
        from: '"express-app" <jagguappnew@gmail.com',
        to: req.body.email,
        subject: 'your recovery otp',
        text: val
      };

      transporter.sendMail(HelperOptions, function (error, info) {
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
  User.find({
      email: req.body.email
    })
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
      } else {
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
