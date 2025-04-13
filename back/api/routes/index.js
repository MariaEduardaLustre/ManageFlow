const bodyParser = require('body-parser')
 
const usuario = require('./usuariosRoute')
const auth = require('./authRoute')

module.exports = app => {
  app.use(
    bodyParser.json(),
    auth,
    usuario
    
  )
}
