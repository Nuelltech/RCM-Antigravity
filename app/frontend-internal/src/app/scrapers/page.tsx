"use client";

import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, BarChart3, Trash2, RefreshCw, Bell, TrendingDown, TrendingUp } from 'lucide-react';
import InternalLayout from "@/components/InternalLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MercadoProduto {
    id: number; supermercado: string; nome_produto: string;
    preco: number; unidade: string;
    preco_embalagem?: number | null; tamanho_embalagem?: string | null;
    categoria: string | null;
    url_produto: string | null; ultima_atualizacao: string;
}
interface MarketStat { supermercado: string; total: number; ultima_atualizacao: string | null; }
interface MercadoAlerta {
    id: number; supermercado: string; nome_produto: string;
    preco_anterior: number; preco_novo: number;
    variacao_pct: number; tipo: 'DESCIDA' | 'SUBIDA';
    lido: boolean; data_detetada: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scraper script generators (same logic as the standalone JSX agent)
// ─────────────────────────────────────────────────────────────────────────────

const SUPERMERCADOS = [
    { id: 'pingo-doce', nome: 'Pingo Doce', url: 'https://www.pingodoce.pt' },
    { id: 'auchan', nome: 'Auchan', url: 'https://www.auchan.pt' },
    { id: 'continente', nome: 'Continente', url: 'https://www.continente.pt' },
];

const PD_CATEGORIES = [
    { id: "ec_talho_200", name: "Talho" },
    { id: "ec_peixaria_300", name: "Peixaria" },
    { id: "ec_frutas_legumes_100", name: "Frutas e Vegetais" },
    { id: "ec_padaria_pastelaria_500", name: "Padaria e Pastelaria" },
    { id: "ec_laticinios_ovos_400", name: "Laticínios e Ovos" },
    { id: "ec_mercearia_600", name: "Mercearia" },
    { id: "ec_congelados_700", name: "Congelados" },
    { id: "ec_bebidas_800", name: "Bebidas" },
];

const getPingoDoceScript = (cgid: string, start = 0) => `
(async function() {
  var results = { products: [], totalCount: 0, cgid: '${cgid}', start: ${start}, error: null };
  try {
    var url = '/on/demandware.store/Sites-pingo-doce-Site/pt_PT/Search-Show?cgid=${cgid}&sz=48&start=${start}&format=ajax';
    var res = await fetch(url, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    var html = await res.text();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var totalEl = doc.querySelector('.result-count, .search-results-count, [data-count]');
    if (totalEl) results.totalCount = parseInt(totalEl.textContent.replace(/[^0-9]/g,'')) || 0;
    
    doc.querySelectorAll('.product, [data-pid]').forEach(function(card) {
      try {
        var nameEl = card.querySelector('.product-name-link a, [data-gtm-info]');
        var precoInfoEl = card.querySelector('.buy-price.sale'); // usually shows price/kg like: 6,59 €/Kg
        var packageSizeEl = card.querySelector('.product-unit'); // usually shows package size like: 0.6 KG
        var priceEl = card.querySelector('.value[content]');      // usually package price
        var linkEl = card.querySelector('.product-tile-image-link, .product-name-link a, a[href*="/home/produtos/"]');
        
        var dgtm = card.hasAttribute('data-gtm-info') ? JSON.parse(card.getAttribute('data-gtm-info') || '{}') : {};
        var item = dgtm && dgtm.items && dgtm.items[0] ? dgtm.items[0] : null;
        
        var nome = nameEl ? nameEl.textContent.trim() : (item ? item.item_name : '');
        var href = linkEl ? linkEl.getAttribute('href') : '';
        var url = href && !href.startsWith('http') ? 'https://www.pingodoce.pt' + href : href;
        var pid = card.getAttribute('data-pid') || '';
        var categoria = item ? (item.item_category || '') : '';
        
        var precoTexto = precoInfoEl ? precoInfoEl.textContent.trim() : '';
        var tamanhoEmbalagem = packageSizeEl ? packageSizeEl.textContent.trim() : '';
        var packagePrice = priceEl ? parseFloat(priceEl.getAttribute('content')) : (item ? item.price : 0);
        
        // Pingo Doce standard matching: "6,59 €/Kg" -> preco 6.59, unid "KG"
        // Wait, PD UI actually shows "6,59 €/Kg" as the main visual price, but sometimes the content is the package price.
        // Let's extract the unit price directly from text if possible, fallback to package price
        var unitPrice = packagePrice;
        var unid = 'UN';
        
        var m = precoTexto.match(/([0-9.,]+)\\s*[€E]\\s*\\/\\s*([a-zA-Z]+)/i);
        if (m) {
          unitPrice = parseFloat(m[1].replace(',', '.'));
          unid = m[2].toUpperCase(); // "KG", "L", "UN"
        } else {
          // If no explicitly /Kg or /L, fallback to the unit string matching
          if (tamanhoEmbalagem) {
            var m2 = tamanhoEmbalagem.match(/([0-9.,]+)\\s*([a-zA-Z]+)/i);
            if(m2 && (m2[2].toUpperCase() === 'KG' || m2[2].toUpperCase() === 'L')) {
                unid = m2[2].toUpperCase(); 
            }
          }
        }
        
        if (nome && unitPrice > 0) {
           results.products.push({ 
             nome, 
             preco: unitPrice, 
             unidade: unid, 
             preco_embalagem: packagePrice && packagePrice !== unitPrice ? packagePrice : null,
             tamanho_embalagem: tamanhoEmbalagem || null,
             url, 
             pid, 
             categoria 
           });
        }
      } catch(e2) {}
    });
  } catch(e) { results.error = e.message; }
  var json = JSON.stringify(results);
  try { copy(json); console.log('[PD] Copiado!'); }
  catch(e) { console.log('[PD] Resultado:'); console.log(json); }
  return json;
})();
`.trim();

const CT_CATEGORIES = [
    { id: "frescos-talho", name: "Talho", slug: "frescos/talho", srule: "FRESH-Talho" },
    { id: "frescos-peixaria", name: "Peixaria", slug: "frescos/peixaria", srule: "FRESH-Peixaria" },
    { id: "frescos-frutas-e-legumes", name: "Frutas e Legumes", slug: "frescos/frutas-e-legumes", srule: "FRESH-FrutasLegumes" },
    { id: "frescos-padaria", name: "Padaria e Pastelaria", slug: "frescos/padaria-e-pastelaria", srule: "FRESH-Padaria" },
    { id: "frescos-charcutaria", name: "Charcutaria e Queijos", slug: "frescos/charcutaria-e-queijos", srule: "FRESH-Charcutaria" },
    { id: "frescos-lacticinios", name: "Laticínios", slug: "frescos/lacticinios", srule: "FRESH-Lacticinios" },
    { id: "mercearia", name: "Mercearia", slug: "mercearia", srule: "category-order" },
    { id: "congelados", name: "Congelados", slug: "congelados", srule: "category-order" },
    { id: "bebidas", name: "Bebidas", slug: "bebidas", srule: "category-order" },
];

const getContinenteScript = (cgid: string, start = 0, cat: any) => `
    (async function () {
        var results = { products: [], totalCount: 0, cgid: '${cgid}', start: ${start}, error: null };
try {
    var url = '/${cat.slug}/?start=${start}&srule=${cat.srule}&pmin=0.01&sz=24&format=ajax';
    var res = await fetch(url, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    var html = await res.text();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('.product').forEach(function (el) {
        try {
            var impEl = el.querySelector('[data-product-tile-impression]') || el;
            var d = impEl.hasAttribute('data-product-tile-impression') ? JSON.parse(impEl.getAttribute('data-product-tile-impression') || '{}') : {};
            var nome = d.name ? d.name.trim() : '';
            var packagePrice = d.price ? (typeof d.price === 'number' ? d.price : parseFloat(d.price)) : 0;

            var pack = el.querySelector('.ct-tile-pack-info, .pwc-tile--pack-info');
            var unitPriceEl = el.querySelector('.pwc-m-product-tile__price-per-quantity, .ct-price-per-quantity');
            var link = el.querySelector('a[href*="/produto/"], a.ct-tile-image-link, a[href]');

            var catParts = (d.category || '').split('/');

            var tamanhoEmbalagem = pack ? pack.textContent.replace(/\\n/g, '').trim() : '';
            var unitPriceStr = unitPriceEl ? unitPriceEl.textContent.trim() : '';

            var unitPrice = packagePrice;
            var unid = 'UN';

            // Match example: "29,99€/un" or "14,99€/kg" or "€14.99/kg"
            var m = unitPriceStr.match(/([0-9.,]+)\\s*[€E]?\\s*\\/\\s*([a-zA-Z]+)/i);
            if (m) {
                unitPrice = parseFloat(m[1].replace(',', '.'));
                unid = m[2].toUpperCase();
            } else {
                // Continente shows giant price as Unit Price if it's per kg (e.g. 19.99€/kg)
                var giantPriceEl = el.querySelector('.sales .value, .ct-price-value');
                if (giantPriceEl) {
                    var gm = (giantPriceEl.textContent || '').trim().match(/([0-9.,]+)\\s*[€E]\\s*\\/\\s*([a-zA-Z]+)/i);
                    if (gm) {
                        unitPrice = parseFloat(gm[1].replace(',', '.'));
                        unid = gm[2].toUpperCase();
                    }
                }
            }

            if (nome && unitPrice > 0) {
                results.products.push({
                    nome: nome,
                    preco: unitPrice,
                    unidade: unid,
                    preco_embalagem: packagePrice && packagePrice !== unitPrice ? packagePrice : null,
                    tamanho_embalagem: tamanhoEmbalagem || null,
                    categoria: catParts[catParts.length - 1] || '',
                    pid: d.id || el.getAttribute('data-pid') || '',
                    url: link ? (link.href || 'https://www.continente.pt' + link.getAttribute('href')) : ''
                });
            }
        } catch (e2) { }
    });
    var tc = doc.querySelector('[data-total-count]');
    if (tc) results.totalCount = parseInt(tc.getAttribute('data-total-count')) || 0;
} catch (e) { results.error = e.message; }
var json = JSON.stringify(results);
try { copy(json); console.log('[CT] Copiado!'); }
catch (e) { console.log('[CT] Cola manualmente:'); console.log(json); }
return json;
}) ();
`.trim();


// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'agente' | 'precos' | 'alertas';

export default function ScrapersPage() {
    const [tab, setTab] = useState<Tab>('agente');

    // ── Market agent state ──
    const [supermercado, setSupermercado] = useState(SUPERMERCADOS[0]);
    const [pdCategory, setPdCategory] = useState(PD_CATEGORIES[0]);
    const [ctCategory, setCtCategory] = useState(CT_CATEGORIES[0]);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [products, setProducts] = useState<any[]>([]);
    const [pastedData, setPastedData] = useState('');
    const [logs, setLogs] = useState<{ type: string; msg: string; ts: string }[]>([]);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [importing, setImporting] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // ── Market prices list state ──
    const [marketItems, setMarketItems] = useState<MercadoProduto[]>([]);
    const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
    const [loadingMarket, setLoadingMarket] = useState(false);
    const [filterSuper, setFilterSuper] = useState('');
    const [searchQ, setSearchQ] = useState('');

    // ── Alerts state ──
    const [alertas, setAlertas] = useState<MercadoAlerta[]>([]);
    const [alertasNaoLidos, setAlertasNaoLidos] = useState(0);
    const [loadingAlertas, setLoadingAlertas] = useState(false);
    const [filterAlertTipo, setFilterAlertTipo] = useState<''>('');

    // ── Settings state ──
    const [threshold, setThreshold] = useState(3);
    const [thresholdInput, setThresholdInput] = useState('3');
    const [savingThreshold, setSavingThreshold] = useState(false);
    const [thresholdSaved, setThresholdSaved] = useState(false);

    const token = () => localStorage.getItem('internal_token');
    const API = process.env.NEXT_PUBLIC_API_URL;

    const fetchMarket = async () => {
        setLoadingMarket(true);
        try {
            const params = new URLSearchParams({ limit: '100' });
            if (filterSuper) params.set('supermercado', filterSuper);
            if (searchQ) params.set('q', searchQ);
            const res = await fetch(`${API}/api/internal/market/prices?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
            const data = await res.json();
            setMarketItems(data.items || []);
            setMarketStats(data.stats || []);
        } catch (e) { console.error(e); } finally { setLoadingMarket(false); }
    };

    const fetchAlertas = async () => {
        setLoadingAlertas(true);
        try {
            const res = await fetch(`${API}/api/internal/market/alerts?limit=100`, { headers: { Authorization: `Bearer ${token()}` } });
            const data = await res.json();
            setAlertas(data.items || []);
            setAlertasNaoLidos(data.nao_lidos || 0);
        } catch (e) { console.error(e); } finally { setLoadingAlertas(false); }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API}/api/internal/market/settings`, { headers: { Authorization: `Bearer ${token()}` } });
            const data = await res.json();
            const val = data.alert_threshold_pct ?? 3;
            setThreshold(val);
            setThresholdInput(String(val));
        } catch (e) { console.error(e); }
    };

    const saveThreshold = async () => {
        const val = parseFloat(thresholdInput);
        if (isNaN(val) || val < 0.5 || val > 50) return;
        setSavingThreshold(true);
        try {
            await fetch(`${API}/api/internal/market/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ alert_threshold_pct: val })
            });
            setThreshold(val);
            setThresholdSaved(true);
            setTimeout(() => setThresholdSaved(false), 2000);
        } catch (e) { console.error(e); } finally { setSavingThreshold(false); }
    };

    const fetchAlertCount = async () => {
        try {
            const res = await fetch(`${API}/api/internal/market/alerts/count`, { headers: { Authorization: `Bearer ${token()}` } });
            const data = await res.json();
            setAlertasNaoLidos(data.nao_lidos || 0);
        } catch (e) { console.error(e); }
    };

    const markAlertRead = async (id: number) => {
        await fetch(`${API}/api/internal/market/alerts/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
        setAlertas((prev: MercadoAlerta[]) => prev.map((a: MercadoAlerta) => a.id === id ? { ...a, lido: true } : a));
        setAlertasNaoLidos((prev: number) => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        await fetch(`${API}/api/internal/market/alerts/read-all`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
        setAlertas((prev: MercadoAlerta[]) => prev.map((a: MercadoAlerta) => ({ ...a, lido: true })));
        setAlertasNaoLidos(0);
    };

    const deleteReadAlertas = async () => {
        await fetch(`${API}/api/internal/market/alerts`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
        setAlertas((prev: MercadoAlerta[]) => prev.filter((a: MercadoAlerta) => !a.lido));
    };

    useEffect(() => { if (tab === 'precos') fetchMarket(); }, [tab, filterSuper]);
    useEffect(() => { if (tab === 'alertas') { fetchAlertas(); fetchSettings(); } }, [tab]);
    // Poll alert count every 30s for badge
    useEffect(() => { fetchAlertCount(); const i = setInterval(fetchAlertCount, 30000); return () => clearInterval(i); }, []);

    // ── Agent helpers ──
    const addLog = (type: string, msg: string) => {
        setLogs((prev: any[]) => [...prev, { type, msg, ts: new Date().toLocaleTimeString('pt-PT') }]);
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    const copyScript = (page = 0) => {
        let script = '';
        if (supermercado.id === 'pingo-doce') {
            script = getPingoDoceScript(pdCategory.id, page * 48);
        } else if (supermercado.id === 'continente') {
            script = getContinenteScript(ctCategory.id, page * 24, ctCategory);
        } else {
            script = `// Script para ${supermercado.nome} em construção`;
        }

        navigator.clipboard.writeText(script).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {
            const ta = document.createElement('textarea'); ta.value = script;
            document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
            setCopied(true); setTimeout(() => setCopied(false), 2500);
        });
    };

    const processAndImport = async () => {
        if (!pastedData.trim()) { addLog('error', '❌ Cola os dados primeiro!'); return; }
        setProcessing(true);
        let parsed: any;
        try { parsed = JSON.parse(pastedData); }
        catch { addLog('error', '❌ JSON inválido'); setProcessing(false); return; }

        if (parsed.error) addLog('warn', '⚠️ Erro no script: ' + parsed.error);
        if (parsed.totalCount) { setTotalCount(parsed.totalCount); addLog('info', `📊 Total no site: ${parsed.totalCount} produtos`); }

        if (!parsed.products?.length) { addLog('error', '❌ Nenhum produto extraído'); setProcessing(false); return; }

        // Merge local
        const merged = [...products, ...parsed.products];
        const seen = new Set<string>();
        const deduped = merged.filter(p => { const k = p.pid || p.nome; if (seen.has(k)) return false; seen.add(k); return true; });
        setProducts(deduped);
        addLog('success', `✅ +${parsed.products.length} produtos locais. Total: ${deduped.length}`);
        setPastedData('');

        // Enviar para o backend
        setImporting(true);
        addLog('info', '🚀 A enviar para o backend...');
        try {
            const res = await fetch(`${API}/api/internal/market/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ supermercado: supermercado.id, produtos: parsed.products.map((p: any) => ({ nome: p.nome, preco: Number(p.preco), unidade: p.unidade || 'UN', categoria: p.categoria || undefined, pid: p.pid || undefined, url: p.url || undefined })) })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            addLog('success', `🎉 Guardado! +${result.created} novos, ~${result.updated} atualizados`);
        } catch (e: any) {
            addLog('error', `❌ Erro ao importar: ${e.message}`);
        } finally { setImporting(false); setProcessing(false); }
    };

    const clearSuper = async (id: string) => {
        if (!confirm(`Apagar todos os produtos de ${id}?`)) return;
        await fetch(`${API}/api/internal/market/prices?supermercado=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
        fetchMarket();
    };

    const logColors: Record<string, string> = { info: 'text-blue-600', success: 'text-green-600', warn: 'text-yellow-600', error: 'text-red-600' };
    const pageSize = supermercado.id === 'continente' ? 24 : 48;
    const pagesTotal = totalCount ? Math.ceil(totalCount / pageSize) : '?';
    const progress = totalCount ? Math.round((products.length / totalCount) * 100) : 0;

    return (
        <>
            <ProtectedRoute>
                <InternalLayout>
                    <div className="p-8">
                        {/* Header */}
                        <div className="mb-6 flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Inteligência de Mercado</h1>
                                <p className="text-gray-500 mt-1">Agente de extração de preços dos supermercados e gestão do catálogo de mercado.</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                            {[
                                { id: 'agente', label: '🛒 Agente Scraper' },
                                { id: 'precos', label: '📊 Preços Importados' },
                                { id: 'alertas', label: '🔔 Alertas', badge: alertasNaoLidos },
                            ].map(t => (
                                <button key={t.id} onClick={() => setTab(t.id as Tab)}
                                    className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
                                    {t.label}
                                    {t.badge && t.badge > 0 ? (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                            {t.badge > 9 ? '9+' : t.badge}
                                        </span>
                                    ) : null}
                                </button>
                            ))}
                        </div>

                        {/* ───────── TAB: AGENTE ───────── */}
                        {tab === 'agente' && (
                            <div className="flex gap-6">
                                {/* LEFT controls */}
                                <div className="flex flex-col gap-4" style={{ width: 340, flexShrink: 0 }}>
                                    {/* Step 1 */}
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                        <div className="text-blue-600 font-bold mb-3 flex items-center gap-2 text-sm">
                                            <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                                            Copia o script
                                        </div>
                                        <div className="space-y-2 mb-3">
                                            <select value={supermercado.id}
                                                onChange={e => { setSupermercado(SUPERMERCADOS.find(s => s.id === e.target.value)!); setProducts([]); setLogs([]); setCurrentPage(0); setTotalCount(0); }}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
                                                {SUPERMERCADOS.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                            </select>
                                            {supermercado.id === 'pingo-doce' && (
                                                <select value={pdCategory.id} onChange={e => { setPdCategory(PD_CATEGORIES.find(c => c.id === e.target.value)!); setProducts([]); setCurrentPage(0); setTotalCount(0); }}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
                                                    {PD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            )}
                                            {supermercado.id === 'continente' && (
                                                <select value={ctCategory.id} onChange={e => { setCtCategory(CT_CATEGORIES.find(c => c.id === e.target.value)!); setProducts([]); setCurrentPage(0); setTotalCount(0); }}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
                                                    {CT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            )}
                                        </div>
                                        <button onClick={() => { copyScript(currentPage); }}
                                            className={`w-full py-2 rounded-lg font-bold text-sm transition-all mb-3 ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                                            {copied ? '✓ Script copiado!' : `📋 Copiar Script${currentPage > 0 ? ` (pág. ${currentPage + 1})` : ''}`}
                                        </button>
                                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-xs space-y-1 text-gray-500">
                                            <div className="text-gray-700 font-semibold">Instruções:</div>
                                            <div>1. Abre <span className="text-blue-600">{supermercado.url}</span></div>
                                            <div>2. <kbd className="bg-gray-200 px-1 rounded text-gray-700">F12</kbd> → Console</div>
                                            <div>3. Cola o script e prime Enter</div>
                                            <div>4. Copia o resultado e cola abaixo</div>
                                        </div>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                        <div className="text-violet-600 font-bold mb-3 flex items-center gap-2 text-sm">
                                            <span className="bg-violet-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                                            Importa os dados
                                        </div>
                                        <textarea value={pastedData} onChange={e => setPastedData(e.target.value)}
                                            disabled={processing}
                                            placeholder='{"products":[{"nome":"Bife de Frango","preco":6.49,...}],...}'
                                            className="w-full h-20 border border-gray-200 rounded-lg p-2 text-xs font-mono resize-none focus:outline-none focus:border-violet-400 mb-3 bg-gray-50" />
                                        <div className="flex gap-2">
                                            <button onClick={processAndImport} disabled={processing || importing || !pastedData.trim()}
                                                className="flex-1 py-2 rounded-lg font-bold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-colors">
                                                {importing ? '⏳ A guardar...' : processing ? '⏳ A processar...' : '✅ Processar e Importar'}
                                            </button>
                                            {totalCount > products.length && products.length > 0 && (
                                                <button onClick={() => { const next = currentPage + 1; setCurrentPage(next); copyScript(next); addLog('info', `Pág. ${next + 1} copiada`); }}
                                                    className="flex-1 py-2 rounded-lg font-bold text-sm bg-orange-500 hover:bg-orange-400 text-white transition-colors">
                                                    → Pág. {currentPage + 2}/{pagesTotal}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    {products.length > 0 && (
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                                                <span>Sessão local: {products.length} produtos</span>
                                                {totalCount > 0 && <span className="text-gray-400">{progress}%</span>}
                                            </div>
                                            {totalCount > 0 && (
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                                </div>
                                            )}
                                            <button onClick={() => { setProducts([]); setLogs([]); setCurrentPage(0); setTotalCount(0); setPastedData(''); }}
                                                className="mt-3 text-xs text-gray-400 hover:text-red-500 transition-colors">
                                                ✕ Limpar sessão local
                                            </button>
                                        </div>
                                    )}

                                    {/* Logs */}
                                    {logs.length > 0 && (
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                            <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Log</div>
                                            <div className="overflow-y-auto space-y-0.5" style={{ maxHeight: 150, fontSize: 11, lineHeight: 1.8 }}>
                                                {logs.map((log, i) => (
                                                    <div key={i} className="flex gap-2">
                                                        <span className="text-gray-400 shrink-0">{log.ts}</span>
                                                        <span className={logColors[log.type] || 'text-gray-600'}>{log.msg}</span>
                                                    </div>
                                                ))}
                                                <div ref={logsEndRef} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: products preview */}
                                <div className="flex-1 flex flex-col">
                                    {products.length === 0 ? (
                                        <div className="flex-1 bg-white rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                                            <div className="text-center text-gray-400">
                                                <div className="text-4xl mb-3">🛒</div>
                                                <div className="text-sm">Segue os passos para extrair produtos</div>
                                                <div className="text-xs mt-1 text-gray-300">Os dados ficam aqui e são enviados automaticamente</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 bg-white rounded-xl border border-emerald-200 flex flex-col overflow-hidden">
                                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                                <span className="text-emerald-600 font-bold text-sm">
                                                    {supermercado.nome} — sessão local: {products.length} produtos ✓ guardados na DB
                                                </span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="sticky top-0 bg-gray-50 z-10">
                                                        <tr>
                                                            <th className="text-left p-2 text-gray-400 font-medium">#</th>
                                                            <th className="text-left p-2 text-gray-400 font-medium">Nome</th>
                                                            <th className="text-left p-2 text-gray-400 font-medium">Categoria</th>
                                                            <th className="text-right p-2 text-gray-400 font-medium">Pr. Medida</th>
                                                            <th className="text-right p-2 text-gray-400 font-medium">Pr. Embalagem</th>
                                                            <th className="text-center p-2 text-gray-400 font-medium whitespace-nowrap">Qtd. Emb.</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {products.map((p, i) => (
                                                            <tr key={p.pid || i} className={`border-t border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                                                                <td className="p-2 text-gray-400">{i + 1}</td>
                                                                <td className="p-2 text-gray-800">{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">{p.nome}</a> : p.nome}</td>
                                                                <td className="p-2 text-gray-400">{p.categoria || '—'}</td>
                                                                <td className="p-2 text-right text-emerald-600 font-semibold">{typeof p.preco === 'number' ? `${p.preco.toFixed(2)} €` : p.preco}<span className="text-xs text-gray-400 font-normal ml-1">/{p.unidade}</span></td>
                                                                <td className="p-2 text-right text-indigo-600">{p.preco_embalagem ? `${Number(p.preco_embalagem).toFixed(2)} €` : '—'}</td>
                                                                <td className="p-2 text-center text-gray-400 text-xs">{p.tamanho_embalagem || '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ───────── TAB: PREÇOS ───────── */}
                        {tab === 'precos' && (
                            <div>
                                {/* Stats cards */}
                                {marketStats.length > 0 && (
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        {marketStats.map(s => (
                                            <div key={s.supermercado} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-xs text-gray-500 uppercase tracking-wider">{s.supermercado}</div>
                                                        <div className="text-2xl font-bold text-gray-900 mt-1">{s.total.toLocaleString('pt-PT')}</div>
                                                        <div className="text-xs text-gray-400 mt-1">produtos</div>
                                                    </div>
                                                    <button onClick={() => clearSuper(s.supermercado)} title="Apagar todos"
                                                        className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                {s.ultima_atualizacao && (
                                                    <div className="text-xs text-gray-400 mt-3 border-t border-gray-100 pt-2">
                                                        Atualizado: {new Date(s.ultima_atualizacao).toLocaleString('pt-PT')}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Filters */}
                                <div className="flex gap-3 mb-4">
                                    <input type="text" placeholder="Pesquisar produto..." value={searchQ}
                                        onChange={e => setSearchQ(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && fetchMarket()}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-indigo-400" />
                                    <select value={filterSuper} onChange={e => setFilterSuper(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                                        <option value="">Todos os supermercados</option>
                                        {SUPERMERCADOS.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                    </select>
                                    <button onClick={fetchMarket} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                        <RefreshCw className="h-4 w-4" /> Atualizar
                                    </button>
                                </div>

                                {/* Table */}
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    {loadingMarket ? (
                                        <div className="p-8 text-center text-gray-400">A carregar...</div>
                                    ) : marketItems.length === 0 ? (
                                        <div className="p-12 text-center text-gray-400">
                                            <div className="text-4xl mb-3">📦</div>
                                            <div>Nenhum produto importado ainda.</div>
                                            <div className="text-sm text-gray-300 mt-1">Usa o Agente Scraper para importar preços.</div>
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="text-left p-3 text-gray-500 font-medium">Produto</th>
                                                    <th className="text-left p-3 text-gray-500 font-medium">Supermercado</th>
                                                    <th className="text-left p-3 text-gray-500 font-medium">Categoria</th>
                                                    <th className="text-right p-3 text-gray-500 font-medium">Pr. Medida</th>
                                                    <th className="text-right p-3 text-gray-500 font-medium">Pr. Embalagem</th>
                                                    <th className="text-center p-3 text-gray-500 font-medium whitespace-nowrap">Qtd. Emb.</th>
                                                    <th className="text-right p-3 text-gray-500 font-medium">Atualizado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {marketItems.map(item => (
                                                    <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50">
                                                        <td className="p-3 text-gray-800 font-medium">
                                                            {item.url_produto ? <a href={item.url_produto} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">{item.nome_produto}</a> : item.nome_produto}
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">{item.supermercado}</span>
                                                        </td>
                                                        <td className="p-3 text-gray-500">{item.categoria || '—'}</td>
                                                        <td className="p-3 text-right text-emerald-600 font-semibold">{Number(item.preco).toFixed(2)} €<span className="text-xs text-gray-400 font-normal ml-1">/{item.unidade}</span></td>
                                                        <td className="p-3 text-right text-indigo-600">{item.preco_embalagem ? `${Number(item.preco_embalagem).toFixed(2)} €` : '—'}</td>
                                                        <td className="p-3 text-center text-gray-400 text-xs">{item.tamanho_embalagem || '—'}</td>
                                                        <td className="p-3 text-right text-gray-400 text-xs">{new Date(item.ultima_atualizacao).toLocaleDateString('pt-PT')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ───────── TAB: ALERTAS ───────── */}
                        {tab === 'alertas' && (
                            <div>
                                {/* Settings card */}
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 flex items-center gap-4">
                                    <div className="shrink-0">
                                        <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-0.5">Limiar de Alerta</div>
                                        <div className="text-xs text-indigo-500">Variação mínima (%) para gerar alerta automático</div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-auto">
                                        <input
                                            type="number" min="0.5" max="50" step="0.5"
                                            value={thresholdInput}
                                            onChange={e => setThresholdInput(e.target.value)}
                                            className="w-20 px-2 py-1.5 border border-indigo-300 rounded-lg text-sm text-center font-bold text-indigo-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                        <span className="text-indigo-600 font-bold">%</span>
                                        <button onClick={saveThreshold} disabled={savingThreshold}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm rounded-lg font-medium transition-colors">
                                            {savingThreshold ? '...' : thresholdSaved ? '✓ Guardado' : 'Guardar'}
                                        </button>
                                        <span className="text-xs text-indigo-400">(atual: {threshold}%)</span>
                                    </div>
                                </div>

                                {/* Toolbar */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm text-gray-500">
                                        {alertasNaoLidos > 0
                                            ? <span className="text-red-600 font-semibold">{alertasNaoLidos} alertas não lidos</span>
                                            : <span className="text-gray-400">Sem alertas não lidos</span>}
                                        {' '}<span className="text-gray-300">· {alertas.length} total</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={fetchAlertas}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
                                        </button>
                                        {alertasNaoLidos > 0 && (
                                            <button onClick={markAllRead}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                                                <Bell className="h-3.5 w-3.5" /> Marcar todos como lidos
                                            </button>
                                        )}
                                        {alertas.some(a => a.lido) && (
                                            <button onClick={deleteReadAlertas}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                                                <Trash2 className="h-3.5 w-3.5" /> Apagar lidos
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {loadingAlertas ? (
                                    <div className="p-8 text-center text-gray-400">A carregar alertas...</div>
                                ) : alertas.length === 0 ? (
                                    <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                                        <div className="text-4xl mb-3">🔔</div>
                                        <div className="text-gray-400">Sem alertas de variação de preço.</div>
                                        <div className="text-sm text-gray-300 mt-1">Os alertas aparecem automaticamente quando importas preços que mudaram mais de 3%.</div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {alertas.map(alerta => {
                                            const isDescida = alerta.tipo === 'DESCIDA';
                                            return (
                                                <div key={alerta.id}
                                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${alerta.lido ? 'bg-gray-50 border-gray-100 opacity-60' : isDescida ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                    {/* Icon */}
                                                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isDescida ? 'bg-green-100' : 'bg-red-100'}`}>
                                                        {isDescida
                                                            ? <TrendingDown className="h-5 w-5 text-green-600" />
                                                            : <TrendingUp className="h-5 w-5 text-red-600" />}
                                                    </div>
                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-gray-900 truncate">{alerta.nome_produto}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            <span className="px-1.5 py-0.5 bg-white rounded text-gray-600 border border-gray-200">{alerta.supermercado}</span>
                                                            {' '}· {new Date(alerta.data_detetada).toLocaleString('pt-PT')}
                                                        </div>
                                                    </div>
                                                    {/* Price change */}
                                                    <div className="shrink-0 text-right">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-400 text-sm line-through">{Number(alerta.preco_anterior).toFixed(2)} €</span>
                                                            <span className="text-gray-700 font-bold">{Number(alerta.preco_novo).toFixed(2)} €</span>
                                                        </div>
                                                        <div className={`text-sm font-bold mt-0.5 ${isDescida ? 'text-green-600' : 'text-red-600'}`}>
                                                            {isDescida ? '▼' : '▲'} {Math.abs(Number(alerta.variacao_pct)).toFixed(1)}%
                                                        </div>
                                                    </div>
                                                    {/* Badge + action */}
                                                    <div className="shrink-0 flex flex-col items-end gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${isDescida ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                                            {alerta.tipo}
                                                        </span>
                                                        {!alerta.lido && (
                                                            <button onClick={() => markAlertRead(alerta.id)}
                                                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                                                                ✓ Marcar lido
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                </InternalLayout>
            </ProtectedRoute>
        </>
    );
}

