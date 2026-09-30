"""Gera data.json (agregados) a partir de Dados/Tratados e do Censo Escolar 2023."""
import json
from pathlib import Path
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
TRAT = RAIZ / "Dados" / "Tratados"
CENSO23 = RAIZ / "Dados" / "microdados_censo_escolar_2023" / "dados" / "microdados_ed_basica_2023.csv"

# Subfunções como no cod.qmd; as pequenas (infantil, especial, múltiplo...) vão para "Outras"
BASICA = "Educação básica"  # o cod.qmd usa só esta subfunção como "educação básica"
GRUPOS = ["Ensino superior", "Educação básica", "Ensino profissional", "Assistência hospitalar e ambulatorial",
          "Transferências para a educação básica", "Outras"]
def grupo(s):
    return s if s in GRUPOS else "Outras"

# Os gráficos por quintil do cod.qmd usam o valor NOMINAL do CSV bruto (os de 1 a 4 usam o deflacionado).
# True = reproduz o cod.qmd; False = usa o valor deflacionado do xlsx tratado.
QUINTIS_NOMINAL = True
# True = como no cod.qmd: alunos só dos municípios que receberam emenda; False = todos os alunos do quintil.
ALUNOS_SO_BENEFICIADOS = True

e = pd.read_excel(TRAT / "emendas_parlamentares.xlsx", dtype={"cod_ibge": str})
e["mun"] = pd.to_numeric(e.cod_ibge, errors="coerce")  # "Sem informação" -> NaN
e["edu"] = e.funcao.eq("Educação")
e["grupo"] = e.subfuncao.map(grupo)
anos = sorted(e.ano_emenda.unique().tolist())
tipos = e.groupby("tipo_emenda").valor_empenhado.sum().sort_values(ascending=False).index.tolist()

def por_ano(df, col=None):
    s = df.groupby("ano_emenda").valor_empenhado.sum().reindex(anos, fill_value=0)
    return s.round(2).tolist()

edu = e[e.edu]

if QUINTIS_NOMINAL:
    bruto = pd.read_csv(RAIZ / "Dados" / "EmendasParlamentares.csv", sep=";", encoding="latin1", dtype=str)
    nominal = pd.DataFrame({
        "ano_emenda": bruto["Ano da Emenda"].astype(int),
        "mun": pd.to_numeric(bruto["Código Município IBGE"], errors="coerce"),
        "edu": bruto["Nome Função"].eq("Educação"),
        "grupo": bruto["Nome Subfunção"].map(grupo),
        "valor_empenhado": bruto["Valor Empenhado"].str.replace(".", "", regex=False).str.replace(",", ".", regex=False).astype(float),
    })
    assert len(nominal) == len(e)
    edu_q = nominal[nominal.edu]
else:
    edu_q = edu

out = {
    "anos": anos,
    "total_tipo": {t: por_ano(e[e.tipo_emenda == t]) for t in tipos},
    "edu_tipo": {t: por_ano(edu[edu.tipo_emenda == t]) for t in tipos},
    "total": por_ano(e), "edu": por_ano(edu),
    "edu_grupo": {g: por_ano(edu[edu.grupo == g]) for g in GRUPOS},
}

# quintis IFEM + matrículas públicas
q = pd.read_excel(TRAT / "ifem.xlsx")
mat = pd.read_excel(TRAT / "matriculas.xlsx").set_index("cod_ibge")
c = pd.read_csv(CENSO23, sep=";", encoding="latin1",
                usecols=["CO_MUNICIPIO", "TP_DEPENDENCIA", "QT_MAT_BAS"])
mat["alunos_educacao_basica_23"] = c[c.TP_DEPENDENCIA <= 3].groupby("CO_MUNICIPIO").QT_MAT_BAS.sum()
qnum = lambda s: pd.to_numeric(s.astype(str).str.extract(r"(\d)")[0])

out["por_ano_quintil"] = {}
for yy in (23, 24, 25):
    ano = 2000 + yy
    d = pd.DataFrame({"mun": q.cod_ibge, "q": qnum(q[f"quintil_{yy}"])}).dropna()
    d["alunos"] = d.mun.map(mat[f"alunos_educacao_basica_{yy}"])
    ed = edu_q[edu_q.ano_emenda == ano]
    com_mun = ed[ed.mun.notna()]
    m = com_mun.merge(d, on="mun", how="left")  # q vazio = município fora do IFEM (barra "Sem IFEM")
    idx = [1, 2, 3, 4, 5]
    def por_q(df):  # 5 quintis + "sem IFEM"
        g = df.groupby(df.q.fillna(0)).valor_empenhado.sum()
        return [g.get(i, 0.0) for i in idx + [0]]
    bas = m[m.grupo == BASICA]
    basq = pd.Series(por_q(bas)[:5], index=idx)
    if ALUNOS_SO_BENEFICIADOS:  # denominador como no cod.qmd
        mun_ben = bas.drop_duplicates("mun")
        alunos = mun_ben.groupby("q").alunos.sum().reindex(idx)
    else:
        alunos = d.groupby("q").alunos.sum().reindex(idx)
    out["por_ano_quintil"][ano] = {
        "edu_total": round(ed.valor_empenhado.sum(), 2),
        "edu_sem_municipio": round(ed[ed.mun.isna()].valor_empenhado.sum(), 2),
        "edu_quintil": [round(v, 2) for v in por_q(m)],
        "edu_quintil_grupo": {g: [round(v, 2) for v in por_q(m[m.grupo == g])] for g in GRUPOS},
        "basica_quintil": [round(v, 2) for v in por_q(bas)],
        "alunos": alunos.tolist(),
        "municipios": d.groupby("q").size().reindex(idx).tolist(),
        "basica_por_aluno": (basq / alunos).round(2).tolist(),
    }
out["grupos"] = GRUPOS
Path(__file__).with_name("data.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
P = out["por_ano_quintil"][2025]; print({k: P[k] for k in ("edu_quintil", "basica_quintil", "basica_por_aluno")})
print({k: round(v/1e9,2) for k, v in zip(anos, out["edu"])})
