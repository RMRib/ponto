const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'ponto_db'
});

// Rota de registro de usuário
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    await db.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
    res.json({ message: 'Usuário registrado com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao registrar usuário', error: err });
  }
});

// Rota de login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (rows.length === 0) return res.status(401).json({ message: 'Usuário não encontrado' });

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ message: 'Senha incorreta' });
  res.json({ id: user.id, name: user.name });
});

// Registro de ponto
app.post('/ponto', async (req, res) => {
  const { user_id, type } = req.body;
  await db.query('INSERT INTO time_entries (user_id, timestamp, type) VALUES (?, NOW(), ?)', [user_id, type]);
  res.json({ message: 'Ponto registrado com sucesso' });
});

// Relatório de horas
app.get('/horas/:userId/:mes', async (req, res) => {
  const { userId, mes } = req.params;
  const [rows] = await db.query(`
    SELECT * FROM time_entries 
    WHERE user_id = ? AND DATE_FORMAT(timestamp, '%Y-%m') = ? 
    ORDER BY timestamp ASC
  `, [userId, mes]);

  // Aqui você pode somar os pares de entrada/saída e retornar o total de horas

  res.json(rows);
});
// Relatório de um único dia (entrada, saída, saldo)
app.get('/resumo-dia/:userId/:data', async (req, res) => {
  const { userId, data } = req.params;

  const [[{ daily_goal_minutes }]] = await db.query(
    'SELECT daily_goal_minutes FROM users WHERE id = ?', [userId]
  );

  const [entries] = await db.query(`
    SELECT * FROM time_entries 
    WHERE user_id = ? AND DATE(timestamp) = ? 
    ORDER BY timestamp ASC
  `, [userId, data]);

  let totalMinutos = 0;
  for (let i = 0; i < entries.length; i += 2) {
    if (entries[i + 1]) {
      const entrada = new Date(entries[i].timestamp);
      const saida = new Date(entries[i + 1].timestamp);
      const diffMin = Math.floor((saida - entrada) / (1000 * 60));
      totalMinutos += diffMin;
    }
  }

  const saldo = totalMinutos - daily_goal_minutes;

  res.json({
    data,
    entradas: entries,
    totalMinutos,
    saldo,
    status: saldo >= 0 ? 'positivo' : 'negativo'
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
