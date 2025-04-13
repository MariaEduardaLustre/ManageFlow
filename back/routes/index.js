const bodyParser = require('body-parser')
 

const auth = require('./authRoute')

module.exports = app => {
  app.use(
    bodyParser.json(),
    auth
  )
}