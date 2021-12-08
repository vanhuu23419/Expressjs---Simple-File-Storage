const db = require('mongoose')
const { Schema } = db

//
//
//

const SessionSchema = new Schema({
  init_time: String,
  expire: String,
  data: String
})



const FileSchema = new Schema({
  fileID: String,
  file_name: String,
  created_date: String,
  size: String,
  type: String,
})

//
//
//

module.exports = { SessionSchema, FileSchema }