// Configuração
const API_URL = 'http://localhost:3000';
let usuarioAtual = null;

// ============================================
// FUNÇÕES DE LOGIN/CADASTRO
// ============================================

async function fazerLogin() {
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;
    
    if (!email || !senha) {
        mostrarMensagem('loginMessage', 'Preencha todos os campos', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            usuarioAtual = data.user;
            localStorage.setItem('usuario', JSON.stringify(usuarioAtual));
            window.location.href = 'dashboard.html';
        } else {
            mostrarMensagem('loginMessage', data.error, 'error');
        }
    } catch (error) {
        mostrarMensagem('loginMessage', 'Erro de conexão com o servidor', 'error');
    }
}

async function fazerCadastro() {
    const nome = document.getElementById('cadastroNome').value;
    const email = document.getElementById('cadastroEmail').value;
    const senha = document.getElementById('cadastroSenha').value;
    const confirmarSenha = document.getElementById('cadastroConfirmarSenha').value;
    
    if (!nome || !email || !senha) {
        mostrarMensagem('cadastroMessage', 'Preencha todos os campos', 'error');
        return;
    }
    
    if (senha !== confirmarSenha) {
        mostrarMensagem('cadastroMessage', 'As senhas não coincidem', 'error');
        return;
    }
    
    if (senha.length < 4) {
        mostrarMensagem('cadastroMessage', 'A senha deve ter pelo menos 4 caracteres', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem('cadastroMessage', '✅ Cadastro realizado! Redirecionando...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            mostrarMensagem('cadastroMessage', data.error, 'error');
        }
    } catch (error) {
        mostrarMensagem('cadastroMessage', 'Erro de conexão com o servidor', 'error');
    }
}

function fazerLogout() {
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
}

function mostrarMensagem(elementId, mensagem, tipo) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="${tipo}">${mensagem}</div>`;
        setTimeout(() => {
            element.innerHTML = '';
        }, 3000);
    }
}

// ============================================
// FUNÇÕES DO DASHBOARD
// ============================================

function verificarAutenticacao() {
    const usuario = localStorage.getItem('usuario');
    if (!usuario) {
        window.location.href = 'login.html';
        return false;
    }
    usuarioAtual = JSON.parse(usuario);
    return true;
}

async function carregarDashboard() {
    if (!verificarAutenticacao()) return;
    
    document.getElementById('userName').innerHTML = usuarioAtual.nome;
    
    await carregarFilmes();
    await carregarMinhasAvaliacoes();
}

async function carregarFilmes() {
    try {
        const response = await fetch(`${API_URL}/api/filmes`);
        const filmes = await response.json();
        
        document.getElementById('totalFilmes').innerHTML = filmes.length;
        
        const filmesDiv = document.getElementById('filmesLista');
        if (!filmesDiv) return;
        
        if (filmes.length === 0) {
            filmesDiv.innerHTML = '<p class="loading-container">Nenhum filme disponível no momento.</p>';
            return;
        }
        
        filmesDiv.innerHTML = filmes.map(filme => `
            <div class="filme-card">
                <h3>${filme.titulo}</h3>
                <p><strong>Diretor:</strong> ${filme.diretor}</p>
                <p><strong>Ano:</strong> ${filme.ano}</p>
                <p><strong>Gênero:</strong> ${filme.genero}</p>
                
                <div class="avaliacao-form">
                    <select id="nota-${filme._id}">
                        <option value="10">10 - Excelente</option>
                        <option value="9">9 - Ótimo</option>
                        <option value="8">8 - Muito Bom</option>
                        <option value="7">7 - Bom</option>
                        <option value="6">6 - Regular</option>
                        <option value="5">5 - Mediano</option>
                        <option value="4">4 - Ruim</option>
                        <option value="3">3 - Muito Ruim</option>
                        <option value="2">2 - Péssimo</option>
                        <option value="1">1 - Horroroso</option>
                    </select>
                    <textarea id="comentario-${filme._id}" placeholder="Seu comentário..."></textarea>
                    <label>
                        <input type="checkbox" id="recomendo-${filme._id}"> ⭐ Recomendo este filme
                    </label>
                    <button class="avaliacao-btn" onclick="avaliarFilme('${filme._id}', '${filme.titulo}')">
                        📝 Avaliar
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar filmes:', error);
        const filmesDiv = document.getElementById('filmesLista');
        if (filmesDiv) {
            filmesDiv.innerHTML = '<p class="error">Erro ao carregar filmes. Verifique se o backend está rodando.</p>';
        }
    }
}

async function avaliarFilme(filmeId, titulo) {
    const nota = document.getElementById(`nota-${filmeId}`).value;
    const comentario = document.getElementById(`comentario-${filmeId}`).value;
    const recomendado = document.getElementById(`recomendo-${filmeId}`).checked;
    
    try {
        const response = await fetch(`${API_URL}/api/avaliacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: usuarioAtual.id,
                filmeId: filmeId,
                nota: nota,
                comentario: comentario,
                recomendado: recomendado
            })
        });
        
        if (response.ok) {
            alert(`✅ "${titulo}" avaliado com sucesso!`);
            document.getElementById(`comentario-${filmeId}`).value = '';
            document.getElementById(`recomendo-${filmeId}`).checked = false;
            await carregarMinhasAvaliacoes();
        } else {
            const error = await response.json();
            alert(`❌ Erro: ${error.error}`);
        }
    } catch (error) {
        alert('❌ Erro de conexão com o servidor');
    }
}

async function carregarMinhasAvaliacoes() {
    try {
        const response = await fetch(`${API_URL}/api/minhas-avaliacoes/${usuarioAtual.id}`);
        const avaliacoes = await response.json();
        
        document.getElementById('totalAvaliacoes').innerHTML = avaliacoes.length;
        const recomendados = avaliacoes.filter(a => a.recomendado).length;
        document.getElementById('totalRecomendados').innerHTML = recomendados;
        
        const avaliacoesDiv = document.getElementById('minhasAvaliacoes');
        if (!avaliacoesDiv) return;
        
        if (avaliacoes.length === 0) {
            avaliacoesDiv.innerHTML = '<p>📭 Você ainda não avaliou nenhum filme. Comece agora mesmo!</p>';
            return;
        }
        
        avaliacoesDiv.innerHTML = avaliacoes.map(av => `
            <div class="avaliacao-item ${av.recomendado ? 'recomendado' : 'nao-recomendado'}">
                <h3>🎬 ${av.titulo}</h3>
                <p><strong>Nota:</strong> ${av.nota}/10</p>
                <p><strong>Comentário:</strong> ${av.comentario || 'Sem comentário'}</p>
                <p><strong>Recomendo:</strong> ${av.recomendado ? '✅ Sim' : '❌ Não'}</p>
                <small>${new Date(av.data).toLocaleDateString('pt-BR')}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar avaliações:', error);
    }
}

// ============================================
// INICIALIZAÇÃO POR PÁGINA
// ============================================

// Detectar qual página está carregando e inicializar
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const page = path.split('/').pop();
    
    if (page === 'dashboard.html') {
        carregarDashboard();
    }
    // Não faz verificação automática em login.html e cadastro.html
});

// Exportar funções para o escopo global
window.fazerLogin = fazerLogin;
window.fazerCadastro = fazerCadastro;
window.fazerLogout = fazerLogout;
window.avaliarFilme = avaliarFilme;