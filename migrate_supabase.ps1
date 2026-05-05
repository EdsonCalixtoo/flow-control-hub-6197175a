# SCRIPT DE MIGRAÇÃO PROFISSIONAL SUPABASE (PowerShell) - VERSÃO LIMPA
$SOURCE_URL = "postgresql://postgres:lICANTROPOS1324%40@db.wezxkgeaaddmpmijudjt.supabase.co:5432/postgres"
$TARGET_URL = "postgresql://postgres:lICANTROPOS1324%40@db.iyjvaizmeimwxatdhnne.supabase.co:5432/postgres"
$DUMP_FILE = "supabase_dump.sql"

Write-Host "--- Iniciando Migracao Supabase ---" -ForegroundColor Cyan

# Tenta encontrar o pg_dump se não estiver no PATH
$pgDumpPath = "pg_dump"
$psqlPath = "psql"

if (!(Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "[!] pg_dump nao encontrado no PATH. Buscando em pastas padrao..." -ForegroundColor Gray
    $found = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Filter pg_dump.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $pgDumpPath = $found.FullName
        $psqlPath = Join-Path (Split-Path $pgDumpPath) "psql.exe"
        Write-Host "[+] Encontrado em: $(Split-Path $pgDumpPath)" -ForegroundColor Gray
    } else {
        Write-Host "ERRO: Ferramentas do Postgres nao encontradas. Instale ou adicione ao PATH." -ForegroundColor Red
        exit
    }
}

# 1. Gerar Dump (Public e Auth)
Write-Host "[1/3] Gerando dump dos schemas public e auth..." -ForegroundColor Yellow
& $pgDumpPath --dbname=$SOURCE_URL --format=p --clean --if-exists --no-owner --no-privileges --quote-all-identifiers --schema=public --schema=auth --file=$DUMP_FILE

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao gerar dump. Verifique se o pg_dump esta instalado." -ForegroundColor Red
    exit
}

# 2. Restaurar
Write-Host "[2/3] Restaurando dados no banco de destino..." -ForegroundColor Yellow
& $psqlPath --dbname=$TARGET_URL --file=$DUMP_FILE

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha na restauracao. Verifique as credenciais." -ForegroundColor Red
} else {
    Write-Host "SUCESSO: Migracao concluida com sucesso!" -ForegroundColor Green
}

# 3. Limpeza
if (Test-Path $DUMP_FILE) {
    Remove-Item $DUMP_FILE
    Write-Host "[3/3] Arquivo temporario removido."
}
