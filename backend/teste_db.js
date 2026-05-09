const { Pool } = require('pg');

const pool = new Pool({
    user: 'admin',
    password: 'admin123',
    host: 'localhost',
    port: 5432,
    database: 'avaliacao_filmes',
});

async function testar() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Conectado ao PostgreSQL!', result.rows[0]);
    } catch (error) {
        console.error('❌ Erro de conexão:', error.message);
    }
}

testar();