// Configuração
const API_URL = 'http://localhost:3000';
let usuarioAtual = null;

// ============================================
// FUNÇÕES DE LOGIN/CADASTRO
// ============================================

// Carregar usuário do localStorage ao iniciar
window.onload = () => {
    const savedUser = localStorage.getItem('usuario');
    if (savedUser) {
        usuarioAtual = JSON.parse(savedUser);
        entrarNoApp();
    }
};

async function fazerLogin() {
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;
    
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
            entrarNoApp();
        } else {
            document.getElementById('loginMessage').innerHTML = 
                `<div class="error">${data.error}</div>`;
        }
    } catch (error) {
        document.getElementById('loginMessage').innerHTML = 
            `<div class="error">Erro de conexão com o servidor</div>`;
    }
}

async function fazerCadastro() {
    const nome = document.getElementById('cadastroNome').value;
    const email = document.getElementById('cadastroEmail').value;
    const senha = document.getElementById('cadastroSenha').value;
    
    try {
        const response = await fetch(`${API_URL}/api/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('cadastroMessage').innerHTML = 
                '<div class="success">✅ Cadastro realizado! Faça login.</div>';
            setTimeout(() => mostrarLogin(), 1500);
        } else {
            document.getElementById('cadastroMessage').innerHTML = 
                `<div class="error">${data.error}</div>`;
        }
    } catch (error) {
        document.getElementById('cadastroMessage').innerHTML = 
            '<div class="error">Erro de conexão com o servidor</div>';
    }
}

function mostrarCadastro() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('cadastroForm').style.display = 'block';
    document.getElementById('loginMessage').innerHTML = '';
    document.getElementById('cadastroMessage').innerHTML = '';
}

function mostrarLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('cadastroForm').style.display = 'none';
    document.getElementById('loginMessage').innerHTML = '';
    document.getElementById('cadastroMessage').innerHTML = '';
}

function fazerLogout() {
    usuarioAtual = null;
    localStorage.removeItem('usuario');
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginSenha').value = '';
}

// ============================================
// FUNÇÕES DO APP PRINCIPAL
// ============================================

async function entrarNoApp() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('userName').innerHTML = usuarioAtual.nome;
    
    await carregarFilmes();
    await carregarMinhasAvaliacoes();
}

async function carregarFilmes() {
    try {
        const response = await fetch(`${API_URL}/api/filmes`);
        const filmes = await response.json();
        
        const filmesDiv = document.getElementById('filmesLista');
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
        
        const avaliacoesDiv = document.getElementById('minhasAvaliacoes');
        
        if (avaliacoes.length === 0) {
            avaliacoesDiv.innerHTML = '<p>📭 Você ainda não avaliou nenhum filme.</p>';
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

// Exportar funções para o escopo global (para funcionar com onclick no HTML)
window.fazerLogin = fazerLogin;
window.fazerCadastro = fazerCadastro;
window.mostrarLogin = mostrarLogin;
window.mostrarCadastro = mostrarCadastro;
window.fazerLogout = fazerLogout;
window.avaliarFilme = avaliarFilme;