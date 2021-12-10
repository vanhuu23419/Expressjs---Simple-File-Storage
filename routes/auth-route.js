const {actionWrapper} = require('./1.trycatch-action-wrapper')
const { AppError } = require('../models/error-models/app-error')
const { ActionSuccess } = require('../models/action-success')
var express = require('express')
const authRouter = express.Router()
const {updateSession} = require('./session-route')
const url = require('url')
var crypto = require('crypto');

const db = require('mongoose')
const { SessionSchema, UserSchema } = require('../database/models')
const SessionModel = db.model('Session', SessionSchema, 'Session')
const UserModel = db.model('User', UserSchema, 'User')



///////////////////////////////////////////////

// Check for authentication
authRouter.get(['/','/allFiles','/uploadFiles'], actionWrapper( async (req,res,next)=> {

  if (!req.session.isSignedIn) {
    var path = url.format({ path: '/sign-in.html'})
    res.redirect('/sign-in.html')
  }
  next()
}))

authRouter.post('/sign-in', actionWrapper( async (req,res,next)=> {

  var { username, password } = req.body 
  // Validations
  var validations = {}
  while(true) {   // stop checking when encounts any validation error
    if ( !username ) {
      validations.username = 'Username is required.'
    }
    if ( !password ){
      validations.password = 'Password is required.'
      break
    }
    var user = await UserModel.findOne({username: username})
    if ( ! user ) {
      validations.username = `user name: '${username}' is not exists`
      break
    }
    var hashPassword = crypto.createHash('md5').update(req.body.password).digest('hex')
    if (user.hash_password != hashPassword) {
      validations.password = 'Password is not correct.'
    }
    break 
  }
  
  // Has validation Errors
  if (Object.keys(validations).length > 0){
    res.status(404).send({ status: 'failed', validations })
  }
  // Authorized
  else {
    req.session.isSignedIn = true
    await updateSession(req)
    res.status(200).send(new ActionSuccess())
  }
}))


authRouter.post('/sign-up', actionWrapper( async (req,res,next)=> {

  var { username, password, password_repeat } = req.body 
  // Validations
  var validations = {}
  while(true) {   // stop checking when encounts any validation error
    if ( !username ) {
      validations.username = 'Username is required.'
    }
    if ( !password ){
      validations.password = 'Password is required.'
      break
    }
    if ( !password_repeat ){
      validations.password_repeat = 'Please repeat the password.'
      break
    }
    if( password != password_repeat) {
      validations.password_repeat = 'Password & Password Repeat don\'t match.'
      break
    }
    var user = await UserModel.findOne({username: username})
    if ( user ) {
      validations.username = `user name: '${username}' is already exists`
    }
    break
  }
  // Has validation Errors
  if (Object.keys(validations).length > 0){
    res.status(404).send({ status: 'failed', validations })
    return
  }
  // Create User & Login
  var hash_password = crypto.createHash('md5').update(req.body.password).digest('hex')
  var newUser = new UserModel({ username, hash_password})
  await newUser.save()
  req.session.isSignedIn = true
  await updateSession(req)
  res.send(new ActionSuccess())
}))


authRouter.get('/logout', actionWrapper( async (req,res,next)=> {

  req.session.isSignedIn = false
  await updateSession(req)

  res.redirect('/sign-in.html')
}))


////////////////////////////////////////////////

module.exports = { authRouter }