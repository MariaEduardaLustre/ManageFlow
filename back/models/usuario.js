const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); 

const Usuario = sequelize.define('Usuario', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // Se o ID for auto-incrementável no MySQL
  },
  NOME: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  EMAIL: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  CPF: {
    type: DataTypes.STRING(11),
    allowNull: false,
    unique: true,
  },
  DDI: {
    type: DataTypes.STRING(3),
    allowNull: true,
  },
  DDD: {
    type: DataTypes.STRING(3),
    allowNull: true,
  },
  TELEFONE: {
    type: DataTypes.STRING(9),
    allowNull: true,
  },
  ENDERECO: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  NUMERO: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  SENHA: {
    type: DataTypes.STRING(60), // Importante: Aumentei o tamanho para armazenar a senha hasheada
    allowNull: false,
  },
}, {
  tableName: 'Usuario', // O nome da tabela no seu banco de dados
  timestamps: false,   // Se você não tiver as colunas createdAt e updatedAt
});

module.exports = Usuario;