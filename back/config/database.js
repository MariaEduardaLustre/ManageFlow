const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'manageflow', // Nome do seu banco de dados
  'root',       // Seu usuário do MySQL
  'root',         // Sua senha do MySQL
  {
    host: 'localhost',  // Ou o host do seu servidor MySQL
    dialect: 'mysql',
  }
);

module.exports = sequelize;