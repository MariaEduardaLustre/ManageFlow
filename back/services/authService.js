const database = require('../models');
const Usuario = database.Usuario; // Importa o modelo Usuario
const { compare } = require('bcryptjs');
const { sign } = require('jsonwebtoken');
const jsonSecret = require('../config/jsonSecret');

class AuthService {
  async login(dto) {
    const usuario = await Usuario.findOne({ // Usa o modelo Usuario
      attributes: ['ID', 'EMAIL', 'SENHA'], // Use 'ID' em maiúsculo para corresponder à definição
      where: {
        EMAIL: dto.email
      }
    });

    if (!usuario) {
      throw new Error('Usuario não cadastrado');
    }

    const senhaIguais = await compare(dto.senha, usuario.SENHA); // Use 'SENHA' em maiúsculo

    if (!senhaIguais) {
      throw new Error('Usuario ou senha invalido');
    }

    const accessToken = sign({
      id: usuario.ID, // Use 'ID' em maiúsculo
      email: usuario.EMAIL // Use 'EMAIL' em maiúsculo
    }, jsonSecret.secret, {
      expiresIn: 86400
    });

    return { accessToken };
  }
}

module.exports = AuthService;