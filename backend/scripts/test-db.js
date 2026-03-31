const fs = require('fs');
const mysql = require('mysql2/promise');

async function checkDatabase() {
    try {
        console.log("Connecting to the database...");
        
        // Use the connection string from env
        // e.g. mysql://user:pass@host:port/rcm_db
        // In this case, we'll try to get it from process.env.DATABASE_URL or .env file
        require('dotenv').config({ path: '.env.production' });
        
        let dbUrl = process.env.DATABASE_URL;
        
        if (!dbUrl) {
            console.error("DATABASE_URL not found in .env.production");
            return;
        }
        
        const connection = await mysql.createConnection(dbUrl);
        
        console.log("Connected successfully!");
        
        // Check FormatoVenda for Coca Cola (produto_id = 79)
        const [formatos] = await connection.execute(
            'SELECT * FROM formatos_venda WHERE produto_id = ?', 
            [79]
        );
        
        console.log("\n--- FORMATOS VENDA (Produto 79) ---");
        console.table(formatos);
        
        if (formatos.length > 0) {
            const formatoIds = formatos.map(f => f.id);
            
            // Expected parameter placeholders
            const placeholders = formatoIds.map(() => '?').join(',');
            
            // Check MenuItems associated
            const [menuItems] = await connection.execute(
                `SELECT * FROM menu WHERE formato_venda_id IN (${placeholders})`,
                formatoIds
            );
            
            console.log("\n--- MENU ITEMS (Formats " + formatoIds.join(', ') + ") ---");
            console.table(menuItems);
        }
        
        // Check VariacaoProduto for the same product to get current price
        const [variacoes] = await connection.execute(
            'SELECT id, preco_unitario, data_ultima_compra, ativo FROM variacoes_produto WHERE produto_id = ? ORDER BY data_ultima_compra DESC, id DESC LIMIT 5',
            [79]
        );
        
        console.log("\n--- VARIACOES PRODUTO (Produto 79) ---");
        console.table(variacoes);
        
        await connection.end();
        console.log("\nDone checking.");
        
    } catch (e) {
        console.error("Error connecting or querying:", e);
    }
}

checkDatabase();
