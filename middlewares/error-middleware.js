/* Custom Error Handling Middleware */

const {AppError} = require('../models/error-models/app-error')

const appError = function( error, req, res, next) {

  if (error instanceof AppError)
    res.status(error.statusCode).send( { status: 'failed', message: error.message })
  else
    next(error)
}

module.exports = { appError }