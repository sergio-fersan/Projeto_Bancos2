const API_URL = 'http://localhost:3000';

// ============================================
// FUNÇÕES DE CLIENTES (SQLite)
// ============================================

async function adminCarregarClientes() {
    try {
        const response = await fetch(`${API_URL}/api/clientes`);
        const clientes = await response.json();
        
        // Atualizar contador
        document.getElementById('totalClientes').innerHTML = clientes.length;
        
        const listaDiv = document.getElementById('adminClientesLista');
        
        if (clientes.length === 0) {
            listaDiv.innerHTML = '<div class="loading">Nenhum cliente cadastrado</div>';
            return;
        }
        
        listaDiv.innerHTML = clientes.map(cliente => `
            <div class="item-card" data-id="${cliente.id}">
                <div class="item-info">
                    <h4>${cliente.nome}</h4>
                    <p>✉️ ${cliente.email}</p>
                    <p>🆔 ID: ${cliente.id}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="adminEditarCliente(${cliente.id}, '${cliente.nome}', '${cliente.email}')">✏️ Editar</button>
                    <button class="btn-delete" onclick="adminDeletarCliente(${cliente.id})">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

async function adminCriarCliente() {
    const nome = document.getElementById('adminClienteNome').value;
    const email = document.getElementById('adminClienteEmail').value;
    const senha = document.getElementById('adminClienteSenha').value;
    
    if (!nome || !email || !senha) {
        alert('Preencha todos os campos');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        
        if (response.ok) {
            alert('✅ Cliente criado com sucesso!');
            document.getElementById('adminClienteNome').value = '';
            document.getElementById('adminClienteEmail').value = '';
            document.getElementById('adminClienteSenha').value = '';
            await adminCarregarClientes();
            await adminCarregarEstatisticas();
        } else {
            const error = await response.json();
            alert(`❌ Erro: ${error.error}`);
        }
    } catch (error) {
        alert('❌ Erro ao criar cliente');
    }
}

function adminEditarCliente(id, nomeAtual, emailAtual) {
    // Criar modal para edição
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>✏️ Editar Cliente</h3>
            <input type="text" id="editNome" value="${nomeAtual}" placeholder="Nome">
            <input type="email" id="editEmail" value="${emailAtual}" placeholder="Email">
            <div class="modal-buttons">
                <button class="btn-save" onclick="adminSalvarCliente(${id})">Salvar</button>
                <button class="btn-cancel" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

async function adminSalvarCliente(id) {
    const nome = document.getElementById('editNome').value;
    const email = document.getElementById('editEmail').value;
    
    try {
        const response = await fetch(`${API_URL}/api/clientes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email })
        });
        
        if (response.ok) {
            alert('✅ Cliente atualizado!');
            document.querySelector('.modal').remove();
            await adminCarregarClientes();
        } else {
            alert('❌ Erro ao atualizar cliente');
        }
    } catch (error) {
        alert('❌ Erro ao atualizar cliente');
    }
}

async function adminDeletarCliente(id) {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        try {
            const response = await fetch(`${API_URL}/api/clientes/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('✅ Cliente excluído!');
                await adminCarregarClientes();
                await adminCarregarEstatisticas();
            } else {
                alert('❌ Erro ao excluir cliente');
            }
        } catch (error) {
            alert('❌ Erro ao excluir cliente');
        }
    }
}

// ============================================
// FUNÇÕES DE FILMES (MongoDB)
// ============================================

async function adminCarregarFilmes() {
    try {
        const response = await fetch(`${API_URL}/api/filmes`);
        const filmes = await response.json();
        
        document.getElementById('totalFilmes').innerHTML = filmes.length;
        
        const listaDiv = document.getElementById('adminFilmesLista');
        
        if (filmes.length === 0) {
            listaDiv.innerHTML = '<div class="loading">Nenhum filme cadastrado</div>';
            return;
        }
        
        listaDiv.innerHTML = filmes.map(filme => `
            <div class="item-card" data-id="${filme._id}">
                <div class="item-info">
                    <h4>${filme.titulo}</h4>
                    <p>🎬 Diretor: ${filme.diretor}</p>
                    <p>📅 Ano: ${filme.ano}</p>
                    <p>🎭 Gênero: ${filme.genero}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="adminEditarFilme('${filme._id}', '${filme.titulo}', ${filme.ano}, '${filme.diretor}', '${filme.genero}')">✏️ Editar</button>
                    <button class="btn-delete" onclick="adminDeletarFilme('${filme._id}')">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar filmes:', error);
    }
}

async function adminCriarFilme() {
    const titulo = document.getElementById('adminFilmeTitulo').value;
    const ano = document.getElementById('adminFilmeAno').value;
    const diretor = document.getElementById('adminFilmeDiretor').value;
    const genero = document.getElementById('adminFilmeGenero').value;
    
    if (!titulo || !ano || !diretor || !genero) {
        alert('Preencha todos os campos');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/filmes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, ano: parseInt(ano), diretor, genero })
        });
        
        if (response.ok) {
            alert('✅ Filme adicionado com sucesso!');
            document.getElementById('adminFilmeTitulo').value = '';
            document.getElementById('adminFilmeAno').value = '';
            document.getElementById('adminFilmeDiretor').value = '';
            document.getElementById('adminFilmeGenero').value = '';
            await adminCarregarFilmes();
            await adminCarregarEstatisticas();
        } else {
            alert('❌ Erro ao adicionar filme');
        }
    } catch (error) {
        alert('❌ Erro ao adicionar filme');
    }
}

function adminEditarFilme(id, titulo, ano, diretor, genero) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>✏️ Editar Filme</h3>
            <input type="text" id="editTitulo" value="${titulo}" placeholder="Título">
            <input type="number" id="editAno" value="${ano}" placeholder="Ano">
            <input type="text" id="editDiretor" value="${diretor}" placeholder="Diretor">
            <input type="text" id="editGenero" value="${genero}" placeholder="Gênero">
            <div class="modal-buttons">
                <button class="btn-save" onclick="adminSalvarFilme('${id}')">Salvar</button>
                <button class="btn-cancel" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

async function adminSalvarFilme(id) {
    const titulo = document.getElementById('editTitulo').value;
    const ano = parseInt(document.getElementById('editAno').value);
    const diretor = document.getElementById('editDiretor').value;
    const genero = document.getElementById('editGenero').value;
    
    try {
        const response = await fetch(`${API_URL}/api/filmes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, ano, diretor, genero })
        });
        
        if (response.ok) {
            alert('✅ Filme atualizado!');
            document.querySelector('.modal').remove();
            await adminCarregarFilmes();
        } else {
            alert('❌ Erro ao atualizar filme');
        }
    } catch (error) {
        alert('❌ Erro ao atualizar filme');
    }
}

async function adminDeletarFilme(id) {
    if (confirm('Tem certeza que deseja excluir este filme? Todas as avaliações relacionadas também serão removidas.')) {
        try {
            const response = await fetch(`${API_URL}/api/filmes/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('✅ Filme excluído!');
                await adminCarregarFilmes();
                await adminCarregarEstatisticas();
            } else {
                alert('❌ Erro ao excluir filme');
            }
        } catch (error) {
            alert('❌ Erro ao excluir filme');
        }
    }
}

// ============================================
// ESTATÍSTICAS
// ============================================

async function adminCarregarEstatisticas() {
    try {
        // Buscar total de avaliações
        const response = await fetch(`${API_URL}/api/estatisticas`);
        const data = await response.json();
        
        document.getElementById('totalAvaliacoes').innerHTML = data.totalAvaliacoes || 0;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        document.getElementById('totalAvaliacoes').innerHTML = '0';
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function adminInicializar() {
    console.log('👑 Inicializando painel admin...');
    await adminCarregarClientes();
    await adminCarregarFilmes();
    await adminCarregarEstatisticas();
}

// Iniciar quando a página carregar
adminInicializar();

// Exportar funções para o escopo global
window.adminCriarCliente = adminCriarCliente;
window.adminEditarCliente = adminEditarCliente;
window.adminSalvarCliente = adminSalvarCliente;
window.adminDeletarCliente = adminDeletarCliente;
window.adminCriarFilme = adminCriarFilme;
window.adminEditarFilme = adminEditarFilme;
window.adminSalvarFilme = adminSalvarFilme;
window.adminDeletarFilme = adminDeletarFilme;