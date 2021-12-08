require("dotenv").config()
const express = require('express')
const app = express()
const {appError} = require('./middlewares/error-middleware')
const {fileManagerRouter} = require('./routes/file-manager-route.js')
const {fileUploadRouter} = require('./routes/file-upload-route.js')
const {fileDownloadRouter} = require('./routes/file-download-route.js')

const db = require('mongoose')

///
///
///

fileUploadLimit = 5000000
appSessions = {}

const main = async () => {

  /* Register Middlewares */
  app.use(express.json())
  app.use(express.urlencoded({extended:true, limit: (fileUploadLimit/1000)+'mb'}))
  app.use('/api/v1/file', fileManagerRouter)
  app.use('/api/v1/file/upload', fileUploadRouter)
  // app.use('/api/v1/file/download', fileDownloadRouter)
  app.use(express.static('./views'))
  app.use(appError)

  /* App Start */
  await db.connect(process.env.CONSTR)
  console.log('Connected to database')
  
  //app.post('/test', (req,res) => res.send({data:123}))

  const PORT = process.env.PORT || 4000
  app.listen(PORT, () => console.log('Listening to: localhost:'+PORT))
  
}

main()

//
//
//
