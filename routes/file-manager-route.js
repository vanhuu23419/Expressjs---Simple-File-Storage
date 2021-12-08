
const {actionWrapper} = require('./1.trycatch-action-wrapper')
const { AppError } = require('../models/error-models/app-error')
const { ActionSuccess } = require('../models/action-success')
const fs = require('fs')
const path = require('path')
const mime = require('mime')

const {isFileExists} = require('./file-upload-route')

const db = require('mongoose')
const { FileSchema } = require('../database/models')
const FileModel = db.model('File', FileSchema, 'File')

var express = require('express')
const fileManagerRouter = express.Router()


/////////////////////////////////////////////////////////

// Get user's files stored on server
//
fileManagerRouter.post('/', actionWrapper( async (req,res,next) => {

  var files = await FileModel.find({})
  res.status(200).send(files)
}))

// Download user's files stored on server 
//
fileManagerRouter.get('/download/:fileName/:fileID', actionWrapper( async (req,res,next) => {

  var filePath = path.join(__dirname, '/uploads/', req.params.fileID )
  if ( ! isFileExists(filePath) ) {
    next( new AppError(fileName + ' does not exist.', 404) )
  }
  var mimetype = mime.getType(filePath)
  var fileStream = fs.createReadStream(filePath)
  res.setHeader('Content-disposition', 'attachment; filename=' + req.params.fileName);
  res.setHeader('Content-type', mimetype);
  fileStream.pipe(res)
}))

// Delete user's files stored on server
//
fileManagerRouter.post('/delete/:fileName/:fileID', actionWrapper( async (req,res,next) => {

  var filePath = path.join(__dirname, '/uploads/', req.params.fileID )
  if ( ! isFileExists(filePath) ) {
    next( new AppError(fileName + ' does not exist.', 404) )
  }
  fs.unlink(filePath, (err) => {
    if ( err ) {
      next( new AppError(err.message, 404) )
    }
    res.send(new ActionSuccess())
  })
}))


/////////////////////////////////////////////////////////

module.exports = { fileManagerRouter }