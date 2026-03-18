import fetch from "node-fetch";

export class PingoDoceAPIScraper {
    private catalogueId = "6107d28d72939a003ff6bfeb";
    private baseUrl = `https://mercadao.pt/api/catalogues/${this.catalogueId}`;

    private headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*",
        "X-Requested-With": "XMLHttpRequest"
    };

    async getCategories() {
        const url = `${this.baseUrl}/categories?category=root`;
        console.log("Fetching Categories: " + url);
        const res = await fetch(url, { headers: this.headers });

        if (!res.ok) {
            const text = await res.text();
            console.log("Error body:", text.slice(0, 200));
            throw new Error(`Erro categorias: ${res.status}`);
        }

        const data: any = await res.json();
        if (!Array.isArray(data)) return [];

        return data.map((c: any) => ({
            id: c.id,
            name: c.name
        }));
    }

    async getProductsByCategory(categoryId: string) {
        let offset = 0;
        const limit = 50;

        const url = `${this.baseUrl}/products?categories=${categoryId}&limit=${limit}&offset=${offset}`;
        console.log("Fetching Products: " + url);
        const res = await fetch(url, { headers: this.headers });

        if (!res.ok) {
            console.log("Erro ao buscar produtos", res.status);
            return [];
        }
        const data: any = await res.json();
        return data;
    }
}

async function run() {
    const scraper = new PingoDoceAPIScraper();
    try {
        const cats = await scraper.getCategories();
        console.log("Categorias:", cats.slice(0, 3));

        if (cats.length > 0) {
            const prods = await scraper.getProductsByCategory(cats[0].id);
            console.log("Produtos:", prods.sections?.[0]?.products?.length || prods.products?.length || 0);
        }
    } catch (e) {
        console.error(e);
    }
}

run();
