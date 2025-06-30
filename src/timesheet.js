// Configuração da API
const API_CONFIG = {
    baseURL: 'http://localhost:3000',
    endpoints: {
        login: '/login',
        register: '/register',
        ponto: '/ponto',
        resumoDia: '/resumo-dia',
        horas: '/horas'
    }
};

// Estado da aplicação
class AppState {
    constructor() {
        this.currentUser = null;
        this.isLoading = false;
    }

    setUser(user) {
        this.currentUser = user;
        this.saveToLocalStorage();
    }

    clearUser() {
        this.currentUser = null;
        this.removeFromLocalStorage();
    }

    saveToLocalStorage() {
        if (this.currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    }

    loadFromLocalStorage() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            return true;
        }
        return false;
    }

    removeFromLocalStorage() {
        localStorage.removeItem('currentUser');
    }
}

// Utilitários para UI
class UIUtils {
    static showNotification(message, type = 'info', duration = 3000) {
        // Remove notificações existentes
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Cria nova notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Mostra a notificação
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove a notificação após o tempo especificado
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    static showLoading(element) {
        const originalText = element.textContent;
        element.innerHTML = '<span class="loading"></span> Carregando...';
        element.disabled = true;
        return originalText;
    }

    static hideLoading(element, originalText) {
        element.textContent = originalText;
        element.disabled = false;
    }

    static toggleView(hideElement, showElement) {
        hideElement.style.display = 'none';
        showElement.style.display = 'block';
        showElement.classList.add('fade-in');
    }

    static formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h${mins.toString().padStart(2, '0')}min`;
    }

    static formatSaldo(saldo) {
        const sinal = saldo >= 0 ? '+' : '-';
        const saldoAbs = Math.abs(saldo);
        return `${sinal}${UIUtils.formatTime(saldoAbs)}`;
    }
}

// Serviço de API
class ApiService {
    static async makeRequest(endpoint, options = {}) {
        const url = `${API_CONFIG.baseURL}${endpoint}`;

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, finalOptions);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    static async login(email, password) {
        return this.makeRequest(API_CONFIG.endpoints.login, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    static async register(name, email, password) {
        return this.makeRequest(API_CONFIG.endpoints.register, {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
    }

    static async registrarPonto(userId, type) {
        return this.makeRequest(API_CONFIG.endpoints.ponto, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, type })
        });
    }

    static async getResumoDia(userId, data) {
        return this.makeRequest(`${API_CONFIG.endpoints.resumoDia}/${userId}/${data}`);
    }

    static async getHorasMes(userId, mes) {
        return this.makeRequest(`${API_CONFIG.endpoints.horas}/${userId}/${mes}`);
    }
}

// Controlador de autenticação
class AuthController {
    constructor(appState) {
        this.appState = appState;
    }

    async login() {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginButton = document.querySelector('button[onclick="login()"]');

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            UIUtils.showNotification('Por favor, preencha todos os campos', 'error');
            return;
        }

        const originalText = UIUtils.showLoading(loginButton);

        try {
            const userData = await ApiService.login(email, password);
            this.appState.setUser(userData);

            UIUtils.showNotification('Login realizado com sucesso!', 'success');
            this.showDashboard();
        } catch (error) {
            console.error('Erro no login:', error);
            UIUtils.showNotification('Erro no login. Verifique suas credenciais.', 'error');
        } finally {
            UIUtils.hideLoading(loginButton, originalText);
        }

    }

    async register() {
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('newEmail');
        const passwordInput = document.getElementById('newPassword');

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!name || !email || !password) {
            UIUtils.showNotification('Por favor, preencha todos os campos', 'error');
            return;
        }

        try {
            const result = await ApiService.register(name, email, password);
            UIUtils.showNotification(result.message || 'Usuário registrado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro no registro:', error);
            UIUtils.showNotification('Erro ao registrar usuário', 'error');
        }
    }

    showDashboard() {
        const loginWrapper = document.getElementById('login-wrapper');
        const painel = document.getElementById('painel');
        const nomeElement = document.getElementById('nome');

        UIUtils.toggleView(loginWrapper, painel);
        nomeElement.textContent = this.appState.currentUser.name;

        app.pontoController.verResumoHoje();
        app.pontoController.verTabelaMes();

    }

    logout() {
        this.appState.clearUser();
        const loginWrapper = document.getElementById('login-wrapper');
        const painel = document.getElementById('painel');

        document.getElementById('email').value = '';
        document.getElementById('password').value = '';

        UIUtils.toggleView(painel, loginWrapper);
        UIUtils.showNotification('Logout realizado com sucesso!', 'info');
    }

    checkAuthState() {
        if (this.appState.loadFromLocalStorage()) {
            this.showDashboard();
        }
    }
}

// Controlador de ponto
class PontoController {
    constructor(appState) {
        this.appState = appState;
    }

    async registrar(tipo) {
        if (!this.appState.currentUser) {
            UIUtils.showNotification('Usuário não autenticado', 'error');
            return;
        }

        const button = event.target;
        const originalText = UIUtils.showLoading(button);

        try {
            await ApiService.registrarPonto(this.appState.currentUser.id, tipo);
            const tipoTexto = tipo === 'in' ? 'entrada' : 'saída';
            UIUtils.showNotification(`Ponto de ${tipoTexto} registrado!`, 'success');

            // Atualiza automaticamente o resumo do dia
            await this.verResumoHoje();
        } catch (error) {
            console.error('Erro ao registrar ponto:', error);
            UIUtils.showNotification('Erro ao registrar ponto', 'error');
        } finally {
            UIUtils.hideLoading(button, originalText);
        }
    }

    async verResumoHoje() {
        if (!this.appState.currentUser) {
            UIUtils.showNotification('Usuário não autenticado', 'error');
            return;
        }

        const hoje = new Date().toISOString().slice(0, 10);

        try {
            const data = await ApiService.getResumoDia(this.appState.currentUser.id, hoje);

            const resumoElement = document.getElementById('resumoDia');
            resumoElement.innerHTML = `
                <strong>Resumo do Dia</strong><br>
                Trabalhado: ${UIUtils.formatTime(data.totalMinutos)} | 
                Saldo: ${UIUtils.formatSaldo(data.saldo)}
            `;
        } catch (error) {
            console.error('Erro ao buscar resumo do dia:', error);
            UIUtils.showNotification('Erro ao carregar resumo do dia', 'error');
        }
    }

    async verTabelaMes() {
        if (!this.appState.currentUser) {
            UIUtils.showNotification('Usuário não autenticado', 'error');
            return;
        }

        const hoje = new Date();
        const mesAtual = hoje.toISOString().slice(0, 7);

        try {
            const dados = await ApiService.getHorasMes(this.appState.currentUser.id, mesAtual);
            this.renderTabelaMes(dados);
        } catch (error) {
            console.error('Erro ao buscar dados do mês:', error);
            UIUtils.showNotification('Erro ao carregar dados do mês', 'error');
        }
    }

    renderTabelaMes(dados) {
        const agrupadoPorData = {};

        // Agrupa os dados por data
        for (const item of dados) {
            const dt = new Date(item.timestamp);
            const data = dt.toLocaleDateString('pt-BR');
            const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            if (!agrupadoPorData[data]) agrupadoPorData[data] = [];
            agrupadoPorData[data].push({ hora, tipo: item.type });
        }

        // Constrói a tabela
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Entrada</th>
                        <th>Saída</th>
                        <th>Entrada</th>
                        <th>Saída</th>
                        <th>Entrada</th>
                        <th>Saída</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let saldoTotalMin = 0;

        for (const data in agrupadoPorData) {
            const registros = agrupadoPorData[data];
            let colunas = ['', '', '', '', '', ''];
            let totalMin = 0;
            console.log(`Processando data: ${data}`, registros);
            // Converte data de dd/mm/yyyy para yyyy-mm-dd
            const [dia, mes, ano] = data.split('/');
            const dataISO = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;

            for (let i = 0; i < 6; i += 2) {
                if (registros[i] && registros[i].tipo === 'in') colunas[i] = registros[i].hora;
                if (registros[i + 1] && registros[i + 1].tipo === 'out') colunas[i + 1] = registros[i + 1].hora;

                // Calcula o tempo trabalhado
                if (registros[i] && registros[i + 1]) {
                    const entrada = new Date(`${dataISO}T${registros[i].hora}:00`);
                    const saida = new Date(`${dataISO}T${registros[i + 1].hora}:00`);
                    totalMin += Math.floor((saida - entrada) / 60000);
                }
            }

            saldoTotalMin += totalMin;

            html += `
        <tr>
            <td><strong>${data}</strong></td>
            <td>${colunas[0] || '-'}</td>
            <td>${colunas[1] || '-'}</td>
            <td>${colunas[2] || '-'}</td>
            <td>${colunas[3] || '-'}</td>
            <td>${colunas[4] || '-'}</td>
            <td>${colunas[5] || '-'}</td>
            <td><strong>${UIUtils.formatTime(totalMin)}</strong></td>
        </tr>
    `;
        }

        html += `
        </tbody>
    </table>`;

    let resumoMes = `    <div style="margin-top:10px;text-align:right"><br>
        <strong>Saldo Total do Mês: ${UIUtils.formatTime(saldoTotalMin)}</strong>
    </div>`
    
    document.getElementById('resumoMes').innerHTML = resumoMes;    

        document.getElementById('tabelaMes').innerHTML = html;
    }
}

// Inicialização da aplicação
class App {
    constructor() {
        this.appState = new AppState();
        this.authController = new AuthController(this.appState);
        this.pontoController = new PontoController(this.appState);

        //this.init();
    }

    init() {
        // Verifica se há usuário logado
        this.authController.checkAuthState();

        // Configura eventos globais
        this.setupGlobalEvents();

        console.log('Aplicação inicializada com sucesso!');
    }

    setupGlobalEvents() {
        // Permite login com Enter
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const loginWrapper = document.getElementById('login-wrapper');
                if (loginWrapper.style.display !== 'none') {
                    this.authController.login();
                }
            }
        });
    }
}

// Funções globais para compatibilidade com o HTML existente
let app;


function login() {
    app.authController.login();


}

function registrarUsuario() {
    app.authController.register();
    UIUtils.toggleView(registerContainer, loginContainer);
    document.getElementById('name').value = '';
    document.getElementById('newEmail').value = '';
    document.getElementById('newPassword').value = '';
}

function registrar(tipo) {
    app.pontoController.registrar(tipo);
}

function verResumoHoje() {
    app.pontoController.verResumoHoje();
}

function verTabelaMes() {
    app.pontoController.verTabelaMes();
}

function logout() {
    app.authController.logout();
}

function atualizarRelogio() {
    const agora = new Date();
    const horas = agora.getHours().toString().padStart(2, '0');
    const minutos = agora.getMinutes().toString().padStart(2, '0');
    const segundos = agora.getSeconds().toString().padStart(2, '0');
    document.getElementById('relogio').textContent = `${horas}:${minutos}:${segundos}`;
  }
  setInterval(atualizarRelogio, 1000);
  atualizarRelogio();
// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    app.init();
});

