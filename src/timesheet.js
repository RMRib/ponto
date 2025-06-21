let currentUser = null;

async function registrarUsuario() {
  const name = document.getElementById('name').value;
  const email = document.getElementById('newEmail').value;
  const password = document.getElementById('newPassword').value;

  const res = await fetch('http://localhost:3000/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();
  alert(data.message);
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  console.log('Tentando login com:', { email, password });

  const res = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  console.log('Resposta do servidor:', res);
  if (res.ok) {
    currentUser = await res.json();
    document.getElementById('login-wrapper').style.display = 'none';
    document.getElementById('painel').style.display = 'block';
    document.getElementById('nome').textContent = currentUser.name;
  } else {
    alert('Erro no login');
  }
}

async function registrar(tipo) {
  await fetch('http://localhost:3000/ponto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUser.id, type: tipo })
  });
  alert('Ponto registrado!');
}

async function verResumoHoje() {
  const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const res = await fetch(`http://localhost:3000/resumo-dia/${currentUser.id}/${hoje}`);
  const data = await res.json();

  const horas = Math.floor(data.totalMinutos / 60);
  const minutos = data.totalMinutos % 60;
  const sinal = data.saldo >= 0 ? '+' : '-';
  const saldoAbs = Math.abs(data.saldo);
  const saldoHoras = Math.floor(saldoAbs / 60);
  const saldoMin = saldoAbs % 60;

  document.getElementById('resumoDia').textContent =
    `Trabalhado: ${horas}h${minutos.toString().padStart(2, '0')}min | ` +
    `Saldo: ${sinal}${saldoHoras}h${saldoMin.toString().padStart(2, '0')}min`;
}

async function verTabelaMes() {
  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7);
  const res = await fetch(`http://localhost:3000/horas/${currentUser.id}/${mesAtual}`);
  const dados = await res.json();

  const agrupadoPorData = {};

  for (const item of dados) {
    const dt = new Date(item.timestamp);
    const data = dt.toLocaleDateString();
    const hora = dt.toLocaleTimeString();

    if (!agrupadoPorData[data]) agrupadoPorData[data] = [];
    agrupadoPorData[data].push({ hora, tipo: item.type });
  }

  let html = '<table border="1"><tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Entrada</th><th>Saída</th><th>Total</th></tr>';

  for (const data in agrupadoPorData) {
    const registros = agrupadoPorData[data];
    let colunas = ['', '', '', ''];
    let totalMin = 0;

    for (let i = 0; i < registros.length; i += 2) {
      if (registros[i] && registros[i].tipo === 'in') colunas[i] = registros[i].hora;
      if (registros[i + 1] && registros[i + 1].tipo === 'out') colunas[i + 1] = registros[i + 1].hora;

      if (registros[i + 1]) {
        const entrada = new Date(`${data} ${registros[i].hora}`);
        const saida = new Date(`${data} ${registros[i + 1].hora}`);
        totalMin += Math.floor((saida - entrada) / 60000);
      }
    }

    const totalH = Math.floor(totalMin / 60);
    const totalM = totalMin % 60;

    html += `<tr><td>${data}</td><td>${colunas[0] || ''}</td><td>${colunas[1] || ''}</td><td>${colunas[2] || ''}</td><td>${colunas[3] || ''}</td><td>${totalH}h${totalM.toString().padStart(2, '0')}</td></tr>`;
  }

  html += '</table>';
  document.getElementById('tabelaMes').innerHTML = html;
}