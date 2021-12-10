const {actionWrapper} = require('./1.trycatch-action-wrapper')
const { AppError } = require('../models/error-models/app-error')
const { ActionSuccess } = require('../models/action-success')
var express = require('express')
const sessionRouter = express.Router()

const db = require('mongoose')
const { SessionSchema } = require('../database/models')
const SessionModel = db.model('Session', SessionSchema, 'Session')


///////////////////////////////////////////////

const maxAges = 1000*60*30 // 5mins

function genSID( ) {
  return Date.now().toString()
}

async function updateSession(req) {
  // var sessionDBInstance = await SessionModel.findOne({SID: req.cookies.SID})
  await SessionModel.updateOne({SID: req.cookies.SID}, { jsonData: JSON.stringify(req.session)} )
}

async function newSession(req, res) {
  var newSID = genSID(), data = { expiredAt: Date.now() + maxAges }
  var sessionDbInstance = new SessionModel({
    SID: newSID,
    jsonData: JSON.stringify(data)
  })
  await sessionDbInstance.save()
  // Set session data
  req.session = data
  // Set cookie data
  res.cookie('SID', newSID)
}

async function querySessionData(SID) {
  var sessionDBInstance = await SessionModel.findOne({ SID: SID })
  var session = sessionDBInstance ? JSON.parse(sessionDBInstance.jsonData) : undefined
  return session
}

// Set the Session Data that stored in DB
// for the Request
sessionRouter.use(['/','/allFiles','/uploadFiles','/sign-in', '/logout'],actionWrapper( async (req,res,next)=> {
  // Already executed
  if (req.session) {
    next()
    return
  }
  // UnInitialized Session
  var cookieSID = req.cookies ? req.cookies.SID : null
  if (!cookieSID) {
    await newSession(req, res)
    next() 
    return
  }
  var session = await querySessionData(cookieSID)
  if (!session) {
    await newSession(req, res)
    next() 
    return
  }
  // Session Expired
  if (Date.now() > session.expiredAt) {
    await SessionModel.deleteOne({SID: cookieSID})
    await newSession(req, res)
    next()
    return
  }
  // Get & set data for req.session
  req.session = session
  next()
}))


////////////////////////////////////////////////

module.exports = { sessionRouter, updateSession }