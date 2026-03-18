import { useState, useRef } from "react";

// IDs reais confirmados via data-querystring="cgid=ec_talho_200"
const CATEGORIES = [
  { id: "ec_talho_200",               name: "Talho" },
  { id: "ec_peixaria_300",            name: "Peixaria" },
  { id: "ec_frutas_legumes_100",      name: "Frutas e Vegetais" },
  { id: "ec_padaria_pastelaria_500",  name: "Padaria e Pastelaria" },
  { id: "ec_laticinios_ovos_400",     name: "Laticínios e Ovos" },
  { id: "ec_mercearia_600",           name: "Mercearia" },
  { id: "ec_congelados_700",          name: "Congelados" },
  { id: "ec_bebidas_800",             name: "Bebidas" },
];

// Selectores confirmados via inspecção do HTML real (Março 2026):
// .product-name-link a          → nome
// .value[content]               → preço (atributo content="6.49")
// .product-unit                 → unidade "0.5 Kg"
// .product-tile-image-link      → URL
// data-gtm-info                 → JSON com item_name, price, item_category
const getExtractorScript = (cgid, start = 0) => `
(async function() {
  var results = { products: [], totalCount: 0, cgid: '${cgid}', start: ${start}, error: null };
  try {
    var url = '/on/demandware.store/Sites-pingo-doce-Site/pt_PT/Search-Show?cgid=${cgid}&sz=48&start=${start}&format=ajax';
    console.log('[PD] A chamar:', url);
    var res = await fetch(url, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    var html = await res.text();
    console.log('[PD] HTML:', html.length, 'chars | status:', res.status);

    var doc = new DOMParser().parseFromString(html, 'text/html');

    // Total de produtos
    var totalEl = doc.querySelector('.result-count, .search-results-count, [data-count]');
    if (totalEl) results.totalCount = parseInt(totalEl.textContent.replace(/[^0-9]/g,'')) || 0;

    // Extrair via data-gtm-info (fonte mais fiável — JSON embutido no SFCC)
    var tiles = doc.querySelectorAll('[data-gtm-info]');
    console.log('[PD] Tiles com GTM:', tiles.length);

    tiles.forEach(function(tile) {
      try {
        // GTM data já tem item_name e price prontos
        var gtm = JSON.parse(tile.getAttribute('data-gtm-info'));
        var item = gtm && gtm.items && gtm.items[0];

        var nome = item ? item.item_name : '';
        var preco = item ? item.price : 0;
        var categoria = item ? (item.item_category || '') : '';

        // Unidade — .product-unit (ex: "0.5 Kg")
        var unitEl = tile.querySelector('.product-unit');
        var unidade = unitEl ? unitEl.textContent.trim() : 'UN';

        // URL — .product-tile-image-link href
        var linkEl = tile.querySelector('.product-tile-image-link, .product-name-link a, a[href*="/home/produtos/"]');
        var href = linkEl ? (linkEl.getAttribute('href') || '') : '';
        var url = href.startsWith('http') ? href : 'https://www.pingodoce.pt' + href;

        // PID
        var pid = tile.getAttribute('data-pid') || '';

        if (nome && preco > 0) {
          results.products.push({ nome: nome, preco: preco, unidade: unidade, url: url, pid: pid, categoria: categoria });
        }
      } catch(e2) {}
    });

    // Fallback: selectores CSS directos se GTM não funcionou
    if (results.products.length === 0) {
      console.log('[PD] GTM falhou, a tentar selectores CSS...');
      doc.querySelectorAll('.product, [data-pid]').forEach(function(card) {
        var nameEl  = card.querySelector('.product-name-link a');
        var priceEl = card.querySelector('.value[content]');
        var unitEl  = card.querySelector('.product-unit');
        var linkEl  = card.querySelector('.product-tile-image-link');

        var nome   = nameEl  ? nameEl.textContent.trim() : '';
        var preco  = priceEl ? parseFloat(priceEl.getAttribute('content')) : 0;
        var unidade = unitEl ? unitEl.textContent.trim() : 'UN';
        var href   = linkEl  ? linkEl.getAttribute('href') : '';
        var url    = href && !href.startsWith('http') ? 'https://www.pingodoce.pt' + href : href;
        var pid    = card.getAttribute('data-pid') || '';

        if (nome && preco > 0) {
          results.products.push({ nome: nome, preco: preco, unidade: unidade, url: url, pid: pid });
        }
      });
    }

    console.log('[PD] Extraídos:', results.products.length, 'produtos');

  } catch(e) {
    results.error = e.message;
    console.error('[PD] Erro:', e);
  }

  // Copiar resultado (funciona no browser — não no Codespace)
  var json = JSON.stringify(results);
  try { copy(json); console.log('[PD] Copiado para clipboard!'); }
  catch(e) { console.log('[PD] copy() nao disponivel. Resultado:'); console.log(json); }
  return json;
})();
`.trim();

export default function PingoDoceAgent() {
  const [logs, setLogs]       = useState([]);
  const [products, setProducts] = useState([]);
  const [running, setRunning] = useState(false);
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [copied, setCopied]   = useState(false);
  const [pastedData, setPastedData] = useState("");
  const [step, setStep]       = useState("idle");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount]   = useState(0);
  const logsEndRef = useRef(null);

  const addLog = (type, msg) => {
    setLogs(prev => [...prev, { type, msg, ts: new Date().toLocaleTimeString("pt-PT") }]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const copyScript = (page = 0) => {
    const script = getExtractorScript(selectedCat.id, page * 48);
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = script; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  };

  const analyzeData = async () => {
    if (!pastedData.trim()) { addLog("error", "❌ Cola os dados primeiro!"); return; }
    setRunning(true);

    let parsed;
    try {
      parsed = JSON.parse(pastedData);
    } catch {
      addLog("error", "❌ JSON inválido — copia o resultado completo");
      setRunning(false); return;
    }

    addLog("success", `✅ Dados recebidos | cgid: ${parsed.cgid} | start: ${parsed.start}`);
    if (parsed.error) addLog("warn", "⚠️  Erro no script: " + parsed.error);
    if (parsed.totalCount) {
      setTotalCount(parsed.totalCount);
      addLog("info", `📊 Total disponível no site: ${parsed.totalCount} produtos`);
    }

    if (parsed.products?.length > 0) {
      const merged = [...products, ...parsed.products];
      // Deduplicar por pid
      const seen = new Set();
      const deduped = merged.filter(p => { if (seen.has(p.pid || p.nome)) return false; seen.add(p.pid || p.nome); return true; });
      setProducts(deduped);
      addLog("success", `🎉 +${parsed.products.length} produtos! Total: ${deduped.length}`);
      setStep("done");
    } else {
      addLog("error", "❌ Nenhum produto extraído. Verifica o log da consola do browser.");
    }

    setPastedData(""); setRunning(false);
  };

  const goNextPage = () => {
    const next = currentPage + 1;
    setCurrentPage(next);
    copyScript(next);
    addLog("info", `📋 Script pág. ${next + 1} copiado (start=${next * 48}). Cola na consola.`);
    setStep("waiting");
  };

  const resetAll = () => { setProducts([]); setLogs([]); setStep("idle"); setCurrentPage(0); setTotalCount(0); setPastedData(""); };

  const exportCSV = () => {
    const BOM = "\uFEFF"; // BOM para Excel reconhecer UTF-8
    const sep = ";";      // Ponto-e-vírgula para Excel PT
    const header = ["Nome", "Preço", "Unidade", "Categoria", "PID", "URL"].join(sep);
    const rows = products.map(p => [
      `"${(p.nome||"").replace(/"/g,'""')}"`,
      String(p.preco).replace(".", ","), // vírgula decimal para Excel PT
      `"${(p.unidade||"").replace(/"/g,'""')}"`,
      `"${(p.categoria||"").replace(/"/g,'""')}"`,
      `"${(p.pid||"")}"`,
      `"${(p.url||"").replace(/"/g,'""')}"`
    ].join(sep));
    const csv = BOM + [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pingodoce-${selectedCat.name.toLowerCase().replace(/\s+/g,"-")}-${products.length}produtos.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const logColors = { info: "text-blue-300", success: "text-emerald-400", warn: "text-yellow-400", error: "text-red-400" };
  const pagesTotal = totalCount ? Math.ceil(totalCount / 48) : "?";
  const progress = totalCount ? Math.round((products.length / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col" style={{ fontFamily: "monospace", fontSize: "13px" }}>

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-5 py-3 flex items-center gap-3">
        <span className="text-xl">🛒</span>
        <div>
          <div className="font-bold text-green-400">Pingo Doce SFCC Scraper</div>
          <div className="text-gray-500 text-xs">Sites-pingo-doce-Site · Search-Show · data-gtm-info</div>
        </div>
        {products.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            {totalCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs text-gray-400">{products.length}/{totalCount}</span>
              </div>
            )}
            <span className="text-emerald-400 font-bold text-sm">{products.length} produtos</span>
            <button onClick={exportCSV} className="text-xs bg-emerald-800 hover:bg-emerald-700 px-3 py-1 rounded text-emerald-200 transition-colors">↓ CSV</button>
            <button onClick={() => {
              const lines = ["Nome\tPreço\tUnidade\tCategoria",
                ...products.map(p => `${p.nome}\t${String(p.preco).replace(".",",")}\t${p.unidade}\t${p.categoria||""}`)
              ].join("\n");
              navigator.clipboard.writeText(lines).then(() => addLog("success", "📋 Copiado! Abre o Excel e faz Ctrl+V"));
            }} className="text-xs bg-blue-800 hover:bg-blue-700 px-3 py-1 rounded text-blue-200 transition-colors">📋 Excel</button>
            <button onClick={resetAll} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-gray-400 transition-colors">✕</button>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex gap-4">

        {/* LEFT — Controls */}
        <div className="flex flex-col gap-4" style={{ width: "340px", flexShrink: 0 }}>

          {/* Step 1 */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <div className="text-blue-400 font-bold mb-3 flex items-center gap-2 text-sm">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
              Copia o script
            </div>
            <select value={selectedCat.id}
              onChange={e => { setSelectedCat(CATEGORIES.find(c => c.id === e.target.value)); resetAll(); }}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-200 text-sm mb-3">
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <button onClick={() => { copyScript(currentPage); setStep("waiting"); }}
              className={`w-full py-2 rounded-lg font-bold text-sm transition-all mb-3 ${copied ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
              {copied ? "✓ Script copiado!" : `📋 Copiar Script${currentPage > 0 ? ` (pág. ${currentPage + 1})` : ""}`}
            </button>

            <div className="bg-gray-950 rounded-lg p-3 border border-gray-800 text-xs space-y-1.5 text-gray-400">
              <div className="text-gray-300 font-bold">Instruções:</div>
              <div>1. Abre <span className="text-blue-400">pingodoce.pt/home/produtos/talho</span></div>
              <div>2. <kbd className="bg-gray-700 px-1 rounded text-gray-300">F12</kbd> → Console</div>
              <div>3. Cola e prime Enter</div>
              <div>4. Se aparecer <span className="text-green-400">"Copiado!"</span> → cola abaixo</div>
              <div>Se não copiar, corre: <span className="text-yellow-300">copy(await (...))</span></div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <div className="text-violet-400 font-bold mb-3 flex items-center gap-2 text-sm">
              <span className="bg-violet-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
              Cola o resultado
            </div>
            <textarea value={pastedData} onChange={e => setPastedData(e.target.value)}
              disabled={running}
              placeholder='{"products":[{"nome":"Bife/Peito de Frango","preco":6.49,...}],...}'
              className="w-full h-20 bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 font-mono resize-none focus:outline-none focus:border-violet-500 mb-3" />
            <div className="flex gap-2">
              <button onClick={analyzeData} disabled={running || !pastedData.trim()}
                className="flex-1 py-2 rounded-lg font-bold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-colors">
                {running ? "⏳..." : "✅ Processar"}
              </button>
              {step === "done" && totalCount > products.length && (
                <button onClick={goNextPage}
                  className="flex-1 py-2 rounded-lg font-bold text-sm bg-orange-600 hover:bg-orange-500 text-white transition-colors">
                  → Pág. {currentPage + 2}/{pagesTotal}
                </button>
              )}
            </div>
          </div>

          {/* Log */}
          {logs.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Log</div>
              <div className="overflow-y-auto space-y-0.5" style={{ maxHeight: "150px", fontSize: "11px", lineHeight: "1.8" }}>
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-gray-600 shrink-0">{log.ts}</span>
                    <span className={logColors[log.type] || "text-gray-300"}>{log.msg}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Products table */}
        <div className="flex-1 flex flex-col">
          {products.length === 0 ? (
            <div className="flex-1 bg-gray-900 rounded-xl border border-gray-700 flex items-center justify-center">
              <div className="text-center text-gray-600">
                <div className="text-4xl mb-3">🛒</div>
                <div className="text-sm">Segue os passos para extrair produtos</div>
                <div className="text-xs mt-1 text-gray-700">Os dados ficam aqui assim que fores colando os resultados</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-gray-900 rounded-xl border border-emerald-900 flex flex-col">
              <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-sm">{selectedCat.name} — {products.length} produtos</span>
                {totalCount > 0 && <span className="text-xs text-gray-500">{pagesTotal} páginas · {totalCount} total</span>}
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-800 z-10">
                    <tr>
                      <th className="text-left p-2 text-gray-400 font-medium">#</th>
                      <th className="text-left p-2 text-gray-400 font-medium">Nome</th>
                      <th className="text-left p-2 text-gray-400 font-medium">Categoria</th>
                      <th className="text-right p-2 text-gray-400 font-medium">Preço</th>
                      <th className="text-center p-2 text-gray-400 font-medium">Unidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={p.pid || i} className={`border-t border-gray-800/50 hover:bg-gray-800/40 ${i % 2 === 0 ? "" : "bg-gray-800/20"}`}>
                        <td className="p-2 text-gray-600">{i + 1}</td>
                        <td className="p-2 text-gray-200">
                          {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">{p.nome}</a> : p.nome}
                        </td>
                        <td className="p-2 text-gray-500">{p.categoria || "—"}</td>
                        <td className="p-2 text-right text-emerald-400 font-bold whitespace-nowrap">
                          {typeof p.preco === "number" ? `${p.preco.toFixed(2)} €` : p.preco}
                        </td>
                        <td className="p-2 text-center text-gray-400">{p.unidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
