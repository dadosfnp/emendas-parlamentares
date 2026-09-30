@echo off
chcp 65001 >nul
rem pushd mapeia caminhos de rede (UNC) para uma letra de unidade temporaria
pushd "%~dp0"
echo Gerando dados...
python preprocess.py
if errorlevel 1 goto erro
echo Iniciando o site em http://localhost:8000 ...
python -m shiny run --launch-browser --port 8000 app.py
if errorlevel 1 goto erro
goto fim
:erro
echo.
echo Algo deu errado. Veja a mensagem acima.
:fim
popd
pause
