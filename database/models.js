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

const SessionModel = db.model('Session', SessionSchema, 'Session')

//
//
//

module.exports = { SessionModel }