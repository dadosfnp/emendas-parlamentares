"""Site scrollytelling: emendas parlamentares e educação (Shiny para Python).

Rodar:  shiny run --reload app.py      (antes, uma vez: python preprocess.py)
"""
import json
from pathlib import Path

from shiny import App, reactive, ui

AQUI = Path(__file__).parent
DADOS = json.loads((AQUI / "data.json").read_text(encoding="utf-8"))

app_ui = ui.page_bootstrap(
    ui.head_content(
        ui.tags.meta(name="viewport", content="width=device-width, initial-scale=1"),
        ui.tags.title("Para onde vão as emendas da Educação?"),
        ui.tags.link(rel="stylesheet", href="style.css"),
        ui.tags.script(src="plotly.min.js"),
    ),
    ui.tags.header(
        ui.tags.p("Emendas parlamentares · 2014–2026", class_="kicker"),
        ui.tags.h1("Para onde vão as emendas da Educação?"),
        ui.tags.p(
            "Quanto o Congresso empenha em emendas, quanto disso é para a Educação "
            "e como esse dinheiro se distribui entre os municípios do Brasil.",
            class_="lead",
        ),
        ui.tags.p("Role para baixo ↓", class_="dica"),
        class_="hero",
    ),
    ui.tags.main(
        ui.div(id="passos"),
        ui.div(
            ui.div(
                ui.div(
                    ui.input_radio_buttons(
                        "ano", "Ano das emendas e do IFEM:",
                        {"2023": "2023", "2024": "2024", "2025": "2025"},
                        selected="2025", inline=True,
                    ),
                    id="filtro",
                ),
                ui.div(id="titulo-grafico"),
                ui.div(id="grafico"),
                ui.div(id="fonte"),
                class_="painel",
            ),
            id="palco",
        ),
        id="cena",
    ),
    ui.tags.footer(
        ui.tags.h2("Notas metodológicas"),
        ui.tags.ul(
            ui.tags.li("Medida: valor empenhado. Os gráficos por ano usam valores deflacionados pelo IPCA (método do tratamento de dados); os gráficos por quintil usam valores nominais, como no cod.qmd."),
            ui.tags.li("2026 é ano parcial (dados até a última atualização do Portal da Transparência)."),
            ui.tags.li("Educação básica = subfunção “Educação básica”. “Outras” reúne subfunções pequenas (infantil, especial, múltiplo etc.)."),
            ui.tags.li("Os gráficos por quintil usam só as emendas com município identificado; as demais ficam de fora. “Sem IFEM” são municípios que não constam no índice."),
            ui.tags.li("Alunos: matrículas da educação básica em escolas públicas (Censo Escolar, INEP). Valor por aluno = empenhado em educação básica ÷ alunos dos municípios que receberam essas emendas."),
            ui.tags.li("Fontes: Portal da Transparência (CGU), IFEM (FNP) e Censo Escolar (INEP)."),
        ),
    ),
    ui.tags.script(src="app.js"),
    title="Emendas e Educação",
)


def server(input, output, session):
    @reactive.effect
    async def _enviar_dados():
        await session.send_custom_message("dados", DADOS)


app = App(app_ui, server, static_assets=AQUI / "www")
