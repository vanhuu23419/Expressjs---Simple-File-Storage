
const {actionWrapper} = require('./1.trycatch-action-wrapper')
const { AppError } = require('../models/error-models/app-error')
const { ActionSuccess } = require('../models/action-success')
var express = require('express')
const fileUploadRouter = express.Router()
const fs = require('fs')
const path = require('path')
const db = require('mongoose')
const { FileSchema } = require('../database/models')
const FileModel = db.model('File', FileSchema, 'File')

function isFileExists( filePath ) {
  try {
    fs.accessSync( filePath )
    return true
  }
  catch(err) {
    return false
  }
}

// Create a unique name for a file ( with ID)
// which is being uploaded in a Session 
function getFileUniqueName( fileName, sessionID ) {
  var ext = path.extname(fileName),
    name = path.basename(fileName, ext) 
  // make sure the file name ID doesnt exist
  var id = sessionID, filePath = ""
  while (true) {
    filePath = path.join(__dirname, '/uploads/' + name + '-' + id + ext) 
    if (! isFileExists(filePath)) {
      break
    }
    // Make new ID
    id += 1
  }
  // return the new file name
  return name + '-' + id + ext 
} 


///////////////////////////////////////////////////////////////////


// Multiple file upload:  Registering a new session for this request
//
fileUploadRouter.post('/start', actionWrapper( async( req, res ) => {

  var newSession = { id: Date.now().toString(), }
  appSessions[newSession.id] = newSession

  res.send({ sessionID: newSession.id, maxChunkSize: fileUploadLimit - 10000 })
}))

// Multiple file upload: Close this 'File Upload Session' 
//
fileUploadRouter.post('/close/:sessionID', actionWrapper( async ( req, res, next ) => {

  delete appSessions[req.params.sessionID]
  res.status(200).send(new ActionSuccess())
}))


// Chunk file upload:  Request to start uploading a file
//                     register a new TEMPID for this file
fileUploadRouter.post('/start/:sessionID/:fileName/:fileSize', actionWrapper(async ( req, res, next ) => {

  var fileName = req.params.fileName, session = appSessions[req.params.sessionID]
  if (! session){
    next( new AppError(`Session: ${req.params.sessionID} doesn't exists.`, 500))
  }
  // add to session
  var tempID = getFileUniqueName('TEMP', session.id )
  appSessions[session.id][tempID] = { name: req.params.fileName, size: req.params.fileSize }
  res.status(200).send({ tempID })
}))

// Chunk file upload:  Append TEMP file with new chunk of data 
//
fileUploadRouter.post('/:tempID', actionWrapper( async ( req, res, next ) => {

  var tempID = req.params.tempID
  var base64 = req.body
  if (base64 && 'chunk' in base64) {

    base64 = base64.chunk
    base64 = base64.replace(/\[AMP\]/g, '&')
    base64 = base64.replace(/\[PLUS\]/g, '+')
  }

  var buffer = Buffer.from(base64, 'base64url')
  fs.appendFile( __dirname+ '/uploads/' + tempID, buffer, (err) => {
    if ( err )
      next( new AppError(err, 500) )
    else {
      res.status(200).send(new ActionSuccess())
    }
  })
}))

// Chunk file upload: Cancel & Remove
//
fileUploadRouter.post('/cancel/:sessionID/:tempID', actionWrapper( async ( req, res, next ) => {

  if (! appSessions[req.params.sessionID]) {
    next( new AppError('Session with ' + req.params.sessionID + ' does not exist', 404))
  }
  if (! appSessions[req.params.sessionID]) {
    next( new AppError('TEMP file with ' + req.params.tempID + ' does not exist', 404))
  }

  var tempFileName = path.join(__dirname, '/uploads/', req.params.tempID)
  if (isFileExists(tempFileName)) {
    fs.unlinkSync(tempFileName)
  }
  delete appSessions[req.params.sessionID][req.params.tempID]
  res.status(200).send('OK')
}))

// Chunk file upload: Finish Upload A File
//
fileUploadRouter.post('/finish/:sessionID/:tempID', actionWrapper( async ( req, res, next ) => {

  // Rename the Temp file ->to-> upload file name
  // and give the new file an unique ID
  var session = appSessions[req.params.sessionID], file = session[req.params.tempID]
  var uniqueFileName = getFileUniqueName( file.name, session.id )
  var tempFile    = path.join(__dirname, '/uploads/', req.params.tempID),
      newFile     = path.join(__dirname, '/uploads/', uniqueFileName)
  fs.rename( tempFile, newFile, async function(err) {

      if ( err )
        next(new AppError(err, 500)) 
      else {
        res.status(200).send(new ActionSuccess())
        var dbInstance = new FileModel({
          fileID: uniqueFileName,
          file_name: file.name,
          created_date: Date.now(),
          size: file.size,
          type: path.extname(file.name),
        })
        await dbInstance.save()
      }
  });
}))

////////////////////////////////////////////////////////////////


module.exports = { fileUploadRouter, isFileExists }