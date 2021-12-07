/*
  This wrapper simplifies Action try catching error process
*/

const { AppError } = require('../models/error-models/app-error')

const actionWrapper = ( action ) => {

  return async function( req, res, next ) {
    try {

      if( typeof action.then === 'function' && action[Symbol.toStringTag] === 'Promise') {
      
        await action(req, res, next)
      }
      else {

        action(req, res, next)
      }
    }
    catch (err) {

      next( err )
    }
  }
}

module.exports = { actionWrapper }