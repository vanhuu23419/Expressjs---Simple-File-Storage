
const {actionWrapper} = require('./1.trycatch-action-wrapper')
var express = require('express')
const fileDownloadRouter = express.Router()
const fs = require('fs')
const { AppError } = require('../models/error-models/app-error')
const { ActionSuccess } = require('../models/action-success')
const path = require('path')
const mime = require('mime')
const { isFileExists } = require('./file-upload-route')


///////////////////////////////////////////////////////////////////


fileDownloadRouter.get('/test/:fileID', actionWrapper( async( req, res ) => {

  var filePath = path.join(__dirname, '/uploads/', req.params.fileName )

  var mimetype = mime.getType(filePath)
  var fileStream = fs.createReadStream(filePath)
  res.setHeader('Content-disposition', 'attachment; filename=' + req.params.fileName);
  res.setHeader('Content-type', mimetype);
  fileStream.pipe(res)
}))



////////////////////////////////////////////////////////////////


module.exports = { fileDownloadRouter }