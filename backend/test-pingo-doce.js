const fetch = require('node-fetch');

async function checkPingoDoceAPI() {
    try {
        console.log("A consultar a API do Mercadão para Categorias Pingo Doce...");

        // Pingo Doce ID no Mercadão é tipically 6107d28d72939a003ff6bfeb
        // ou tenta endpoint aberto:
        const catRes = await fetch("https://mercadao.pt/api/catalogues/6107d28d72939a003ff6bfeb/categories?category=root");

        if (!catRes.ok) {
            console.error("Erro na API (Categorias):", catRes.status, await catRes.text());
            return;
        }

        const catData = await catRes.json();
        console.log("✅ Categorias encontradas:", Object.keys(catData));

        if (catData && Array.isArray(catData)) {
            console.log("Categorias Raiz:", catData.map(c => ({ id: c.id, name: c.name })).slice(0, 5));

            // Fetch a product from the first category
            if (catData.length > 0) {
                const catId = catData[0].id;
                console.log(`\nA consultar produtos para a categoria: ${catData[0].name} (${catId})...`);

                const prodRes = await fetch(`https://mercadao.pt/api/catalogues/6107d28d72939a003ff6bfeb/products?categories=${catId}&limit=5`);
                if (!prodRes.ok) {
                    console.error("Erro na API (Produtos):", prodRes.status);
                    return;
                }

                const prodData = await prodRes.json();
                console.log("✅ API Produtos Resposta:", Object.keys(prodData));

                if (prodData.sections && prodData.sections.length > 0) {
                    const items = prodData.sections[0].products;
                    console.log(`Encontrados ${items.length} produtos.`);
                    items.forEach((p, i) => {
                        const price = p.buying?.price || p.price;
                        const unit = p.buying?.unit || "UN";
                        console.log(`${i + 1}. ${p.name} - ${price}€ / ${unit}`);
                    });
                }
            }
        } else if (catData.categories) {
            console.log("Categorias Raiz:", catData.categories.map(c => ({ id: c.id, name: c.name })).slice(0, 5));
        }

    } catch (error) {
        console.error("Erro no teste:", error.message);
    }
}

checkPingoDoceAPI();
