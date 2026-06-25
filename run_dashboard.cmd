@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Project virtual environment not found.
    echo Run: python -m venv .venv
    echo Then: .venv\Scripts\python.exe -m pip install -r requirements.txt
    exit /b 1
)

echo Starting EVA Speak dashboard...
echo Open this link in your browser:
echo http://localhost:8501
echo.

".venv\Scripts\python.exe" -m streamlit run --server.port 8501 --server.headless true "dashboard\streamlit_app.py"

