

class AppError extends Error {

  constructor( mssg, statusCode ) {
    super(mssg)
    this.statusCode = statusCode
  }
}

module.exports = { AppError }