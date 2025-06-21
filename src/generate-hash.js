// generate-hash.js
const bcrypt = require('bcrypt');

async function gerarHash(senha) {
  const hash = await bcrypt.hash(senha, 10);
  console.log('Senha criptografada:', hash);
}

gerarHash('123456'); // coloque a senha desejada aqui
