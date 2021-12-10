require("dotenv").config()
const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const {appError} = require('./middlewares/error-middleware')
const {fileManagerRouter} = require('./routes/file-manager-route.js')
const {fileUploadRouter} = require('./routes/file-upload-route.js')
const {sessionRouter} = require('./routes/session-route')
const {authRouter} = require('./routes/auth-route')
const url = require('url')

const db = require('mongoose')
const req = require("express/lib/request")

///
///
///

fileUploadLimit = 5000000
appSessions = {}

const main = async () => {
  
  app.use(express.urlencoded({extended:true, limit: (fileUploadLimit/1000)+'mb'}))
  app.use(express.json())
  app.use(cookieParser())
  app.use(sessionRouter)
  app.use(authRouter)
  app.use('/api/v1/file', fileManagerRouter)
  app.use('/api/v1/file/upload', fileUploadRouter)
  app.use(express.static('./views'))
  app.use(appError)

  /* App Start */
  await db.connect(process.env.CONSTR)
  console.log('Connected to database')
  
  const PORT = process.env.PORT || 4000
  app.listen(PORT, () => console.log('Listening to: localhost:'+PORT))
  
}

main()

//
//
//
