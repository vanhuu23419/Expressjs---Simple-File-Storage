const db = require('mongoose')
const { Schema } = db

//
//
//

const SessionSchema = new Schema({
  jsonData: String,
  SID: String
})



const FileSchema = new Schema({
  fileID: String,
  file_name: String,
  created_date: String,
  size: String,
  type: String,
})

const UserSchema = new Schema({
  username: String,
  hash_password: String
})

//
//
//

module.exports = { SessionSchema, FileSchema, UserSchema }