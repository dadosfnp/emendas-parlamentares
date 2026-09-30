/* Scrollytelling: dados chegam do servidor Shiny (mensagem "dados"); o Plotly anima cada passo. */
(function () {
  let D = null, ano = "2025", ativo = -1, atual = null, ticket = 0;

  const nf = (v, d = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const bi = v => "R$ " + nf(v / 1e9) + " bi";
  const mi = v => "R$ " + nf(v / 1e6) + " mi";
  const pc = v => nf(v, 1) + "%";
  const soma = a => a.reduce((s, x) => s + x, 0);
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const Q = ["1º quintil", "2º quintil", "3º quintil", "4º quintil", "5º quintil"];
  const COR_TIPO = ["#1f3a5f", "#2a9d8f", "#e9a23b", "#c8412b", "#8d99ae"];
  const COR_GRUPO = ["#1f3a5f", "#c8412b", "#2a9d8f", "#e9a23b", "#7b5ea7", "#8d99ae"];
  const Q6 = Q.concat(["Sem IFEM"]);
  const i25 = () => D.anos.indexOf(2025);
  const rotAno = a => (a === 2026 ? "2026*" : String(a));

  /* ---------- especificações dos gráficos ---------- */
  const curto = n => n.replace("Emenda Individual - Transferências com Finalidade Definida", "Individual (finalidade definida)")
    .replace("Emenda Individual - Transferências Especiais", "Individual (transf. especiais)").replace(/^Emenda de /, "");

  function empilhado(series, cores, xs, div, hover) {
    return Object.keys(series).map((k, i) => ({
      type: "bar", name: curto(k), x: xs, y: series[k].map(v => v / div),
      marker: { color: cores[i % cores.length] },
      hovertemplate: "%{fullData.name}: " + hover + "<extra></extra>",
    }));
  }

  function especs() {
    const xa = D.anos.map(rotAno);
    const yTot = [0, Math.max(...D.total) / 1e9 * 1.08];
    const P = D.por_ano_quintil[ano];
    const grupos = D.grupos;
    const shares = D.edu.map((v, i) => (v / D.total[i]) * 100);

    return [
      { // 0 total por tipo
        kind: "anos|stack|bi", stack: true,
        titulo: "Valor empenhado em emendas parlamentares", sub: "R$ bilhões, por tipo de emenda",
        data: empilhado(D.total_tipo, COR_TIPO, xa, 1e9, "R$ %{y:,.1f} bi"),
        y: yTot, ytitle: "R$ bilhões",
      },
      { // 1 educação por tipo (mesmas barras, encolhem)
        kind: "anos|stack|bi", stack: true,
        titulo: "Valor empenhado em emendas de Educação", sub: "R$ bilhões, por tipo de emenda — mesma escala do gráfico anterior",
        data: empilhado(D.edu_tipo, COR_TIPO, xa, 1e9, "R$ %{y:,.2f} bi"),
        y: yTot, ytitle: "R$ bilhões",
      },
      { // 2 participação
        kind: "anos|group|pct",
        titulo: "Educação no total de emendas", sub: "% do valor empenhado no ano",
        data: [{ type: "bar", x: xa, y: shares, marker: { color: "#c8412b" }, text: shares.map(pc),
                 textposition: "outside", cliponaxis: false, hovertemplate: "%{y:.1f}% do total<extra></extra>" }],
        y: [0, Math.max(...shares) * 1.25], ytitle: "% do empenhado",
      },
      { // 3 subfunções (100%)
        kind: "anos|stack|pct", stack: true,
        titulo: "Subfunções dentro da Educação", sub: "% do valor empenhado em Educação no ano",
        data: grupos.map((g, i) => ({
          type: "bar", name: g, x: xa,
          y: D.edu_grupo[g].map((v, j) => (D.edu[j] ? (v / D.edu[j]) * 100 : 0)),
          marker: { color: COR_GRUPO[i] }, hovertemplate: "%{fullData.name}: %{y:.1f}%<extra></extra>",
        })),
        y: [0, 100], ytitle: "% da Educação",
      },
      { // 4 municípios atendidos
        kind: "anos|group|mun",
        titulo: "Municípios que receberam emendas", sub: "Nº de municípios com valor empenhado no ano (de 5.570) — só emendas com município identificado",
        data: [["total", "Todas as emendas", "#1f3a5f"], ["edu", "Educação", "#c8412b"], ["basica", "Educação básica", "#2a9d8f"]].map(([k, n, c]) => ({
          type: "bar", name: n, x: xa, y: D.municipios_com_emenda[k], marker: { color: c },
          hovertemplate: "%{fullData.name}: %{y:,d} municípios<extra></extra>",
        })),
        y: [0, Math.max(...D.municipios_com_emenda.total) * 1.08], ytitle: "Nº de municípios", stack: false, legenda: true,
      },
      { // 5 quintil
        kind: "q6|group|mi",
        titulo: "Emendas de Educação por quintil do IFEM · " + ano, sub: "R$ milhões nominais — só emendas com município identificado",
        data: [{ type: "bar", x: Q6, y: P.edu_quintil.map(v => v / 1e6), marker: { color: "#1f3a5f" },
                 text: P.edu_quintil.map(mi), textposition: "outside", cliponaxis: false,
                 hovertemplate: "%{x}: R$ %{y:,.1f} mi<extra></extra>" }],
        y: [0, Math.max(...P.edu_quintil) / 1e6 * 1.2], ytitle: "R$ milhões",
      },
      { // 5 quintil x subfunção
        kind: "q6|stack|mi", stack: true,
        titulo: "Educação por quintil e subfunção · " + ano, sub: "R$ milhões nominais — só emendas com município identificado",
        data: grupos.map((g, i) => ({
          type: "bar", name: g, x: Q6, y: P.edu_quintil_grupo[g].map(v => v / 1e6),
          marker: { color: COR_GRUPO[i] }, hovertemplate: "%{fullData.name}: R$ %{y:,.1f} mi<extra></extra>",
        })),
        y: [0, Math.max(...P.edu_quintil) / 1e6 * 1.1], ytitle: "R$ milhões",
      },
      { // 6 educação básica por quintil
        kind: "q6|group|mi",
        titulo: "Educação básica por quintil do IFEM · " + ano, sub: "R$ milhões nominais — só emendas com município identificado",
        data: [{ type: "bar", x: Q6, y: P.basica_quintil.map(v => v / 1e6), marker: { color: "#c8412b" },
                 text: P.basica_quintil.map(mi), textposition: "outside", cliponaxis: false,
                 hovertemplate: "%{x}: R$ %{y:,.1f} mi<extra></extra>" }],
        y: [0, Math.max(...P.basica_quintil, 1) / 1e6 * 1.2], ytitle: "R$ milhões",
      },
      { // 7 por aluno
        kind: "quintil|group|aluno",
        titulo: "Educação básica por aluno da rede pública · " + ano, sub: "R$ nominais por aluno matriculado nos municípios beneficiados",
        data: [{ type: "bar", x: Q, y: P.basica_por_aluno, marker: { color: "#2a9d8f" },
                 text: P.basica_por_aluno.map(v => "R$ " + nf(v, 2)), textposition: "outside", cliponaxis: false,
                 hovertemplate: "%{x}: R$ %{y:,.2f} por aluno<extra></extra>" }],
        y: [0, Math.max(...P.basica_por_aluno, 0.1) * 1.2], ytitle: "R$ por aluno",
      },
    ];
  }

  /* ---------- textos de cada passo ---------- */
  function textos() {
    const a = i25(), P = D.por_ano_quintil[ano], M = D.municipios_com_emenda;
    const compl = D.anos.map((_, i) => i).filter(i => D.anos[i] <= 2025);
    const sh = D.edu.map((v, i) => (v / D.total[i]) * 100);
    const iMin = compl.reduce((m, i) => (sh[i] < sh[m] ? i : m), compl[0]);
    const iMax = compl.reduce((m, i) => (sh[i] > sh[m] ? i : m), compl[0]);
    const g25 = k => (D.edu_grupo[k][a] / D.edu[a]) * 100;
    const semPct = (P.edu_sem_municipio / P.edu_total) * 100;
    const comMun = soma(P.edu_quintil);
    const iq = P.edu_quintil.indexOf(Math.max(...P.edu_quintil)), qs = P.edu_quintil[5];
    const ib = P.basica_quintil.indexOf(Math.max(...P.basica_quintil));
    const ia = P.basica_por_aluno.indexOf(Math.max(...P.basica_por_aluno));
    const im = P.basica_por_aluno.indexOf(Math.min(...P.basica_por_aluno));
    const aviso = `<p class="aviso">${pc(semPct)} do empenhado em Educação em ${ano} não tem município identificado e por isso não entra nesta análise. Os quintis cobrem ${mi(comMun)} de ${bi(P.edu_total)} (valores nominais)${qs > 0 ? `, incluindo ${mi(qs)} de municípios fora do IFEM` : ""}.</p>`;
    return [
      { t: "O volume das emendas", h: `<p>Em <b>2025</b>, o Congresso empenhou <b>${bi(D.total[a])}</b> em emendas parlamentares. Em 2022 eram ${bi(D.total[D.anos.indexOf(2022)])}.</p><p>As barras separam o total pelos tipos de emenda.</p>` },
      { t: "Quanto vai para a Educação", h: `<p>Filtrando a função Educação, o valor empenhado em 2025 cai para <b>${bi(D.edu[a])}</b>. As mesmas barras, na mesma escala, ficam bem menores.</p>` },
      { t: "Que fatia isso representa", h: `<p>A Educação respondeu por <b>${pc(sh[a])}</b> das emendas de 2025.</p><p>Entre 2014 e 2025, a fatia foi de ${pc(sh[iMin])} (${D.anos[iMin]}) a ${pc(sh[iMax])} (${D.anos[iMax]}).</p><p class="aviso">* 2026 é um ano parcial.</p>` },
      { t: "O que a Educação financia", h: `<p>Em 2025, <b>${pc(g25("Educação básica"))}</b> das emendas de Educação foram para a educação básica e <b>${pc(g25("Ensino superior"))}</b> para o ensino superior.</p><p>Cada barra soma 100% do que foi empenhado em Educação no ano.</p>` },
      { t: "Quantos municípios recebem", h: `<p>Em <b>2025</b>, <b>${nf(M.total[a], 0)}</b> municípios receberam alguma emenda com município identificado, <b>${nf(M.edu[a], 0)}</b> receberam emendas de Educação e <b>${nf(M.basica[a], 0)}</b> de educação básica.</p><p class="aviso">A maior parte do valor de Educação não tem município identificado, então estas contagens são um piso.</p>` },
      { t: "Educação por quintil do IFEM", f: 1, h: `<p>Dividimos os municípios em cinco grupos iguais pelo IFEM. Use o filtro para trocar o ano.</p><p>Em ${ano}, o <b>${Q6[iq]}</b> concentrou a maior parte das emendas com município identificado: <b>${mi(P.edu_quintil[iq])}</b>.</p>${aviso}` },
      { t: "Quintil e subfunção", f: 1, h: `<p>Cada barra mostra em que o dinheiro do quintil foi empenhado em ${ano}.</p>${aviso}` },
      { t: "Só educação básica", f: 1, h: `<p>Olhando apenas a educação básica em ${ano}, o <b>${Q6[ib]}</b> recebeu mais: <b>${mi(P.basica_quintil[ib])}</b>.</p>${aviso}` },
      { t: "Por aluno da rede pública", f: 1, h: `<p>Dividindo pelas matrículas públicas dos municípios que receberam emendas de educação básica em ${ano}, o <b>${Q[ia]}</b> ficou com <b>R$ ${nf(P.basica_por_aluno[ia], 2)}</b> por aluno e o <b>${Q[im]}</b> com R$ ${nf(P.basica_por_aluno[im], 2)}.</p><p>Os quintis têm números muito diferentes de alunos beneficiados (${nf(P.alunos[0] / 1e6, 2)} mi no 1º e ${nf(P.alunos[4] / 1e6, 2)} mi no 5º), o que pesa nesta razão.</p>${aviso}` },
    ];
  }

  /* ---------- desenho ---------- */
  function layoutBase(s) {
    const ink = css("--ink"), line = css("--line"), mut = css("--muted");
    return {
      barmode: s.stack ? "stack" : "group", paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "system-ui, sans-serif", color: ink, size: 13 }, separators: ",.",
      margin: { l: 58, r: 12, t: 8, b: 48 }, showlegend: !!(s.stack || s.legenda),
      legend: { orientation: "h", y: 1.02, yanchor: "bottom", x: 0 },
      xaxis: { fixedrange: true, type: "category", tickvals: s.data[0].x, tickfont: { color: mut, size: 12 }, tickangle: 0 },
      yaxis: { fixedrange: true, range: s.y, gridcolor: line, zeroline: false, title: { text: s.ytitle, font: { size: 12, color: mut } }, tickfont: { color: mut } },
      bargap: 0.25,
    };
  }
  const cfg = { displayModeBar: false, responsive: true };

  function desenhar(idx) {
    const s = especs()[idx], el = document.getElementById("grafico"), meu = ++ticket;
    document.getElementById("titulo-grafico").innerHTML = `${s.titulo}<small>${s.sub}</small>`;
    document.getElementById("fonte").textContent = idx < 5
      ? "Fonte: Portal da Transparência (CGU). Valores empenhados, deflacionados pelo IPCA."
      : "Fonte: Portal da Transparência (CGU), IFEM (FNP) e Censo Escolar (INEP).";
    const quadros = () => ({ data: s.data.map(t => ({ x: t.x, y: t.y, text: t.text })), traces: s.data.map((_, i) => i), layout: { yaxis: { range: s.y } } });
    const anim = { mode: "immediate", transition: { duration: 750, easing: "cubic-in-out" }, frame: { duration: 750, redraw: true } };
    if (atual === s.kind && el.data && el.data.length === s.data.length) {
      Plotly.animate(el, quadros(), anim);
    } else {
      const zero = s.data.map(t => Object.assign({}, t, { y: t.y.map(() => 0), text: t.text ? t.text.map(() => "") : undefined }));
      Plotly.react(el, zero, layoutBase(s), cfg).then(() => { if (meu === ticket) Plotly.animate(el, quadros(), anim); });
    }
    atual = s.kind;
  }

  function montarPassos() {
    const cont = document.getElementById("passos");
    cont.innerHTML = "";
    textos().forEach((p, i) => {
      const d = document.createElement("section");
      d.className = "passo";
      d.dataset.i = i;
      d.innerHTML = `<div class="cartao"><h2>${p.t}</h2>${p.h}</div>`;
      cont.appendChild(d);
      obs.observe(d);
    });
  }

  function atualizarTextos() {
    const t = textos();
    document.querySelectorAll(".passo").forEach((el, i) => { el.querySelector(".cartao").innerHTML = `<h2>${t[i].t}</h2>${t[i].h}`; });
  }

  function ativar(i) {
    if (i === ativo || !D) return;
    ativo = i;
    document.querySelectorAll(".passo").forEach((el, k) => el.classList.toggle("ativo", k === i));
    document.getElementById("filtro").classList.toggle("on", !!textos()[i].f);
    desenhar(i);
  }

  const obs = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) ativar(+e.target.dataset.i); });
  }, { rootMargin: "-45% 0px -45% 0px" });

  function iniciar() {
    ativo = -1;
    montarPassos();
    ativar(0);
  }

  document.addEventListener("DOMContentLoaded", () => {
    Shiny.addCustomMessageHandler("dados", d => { D = d; iniciar(); });
    $(document).on("change", "#ano input", () => {
      ano = $("#ano input:checked").val();
      if (!D) return;
      atualizarTextos();
      if (ativo >= 0) desenhar(ativo);
    });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (ativo >= 0) { atual = null; desenhar(ativo); } });
  });
})();
