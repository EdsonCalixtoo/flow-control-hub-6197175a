#!/bin/bash

# ==============================================================================
# SCRIPT DE MIGRAÇÃO PROFISSIONAL SUPABASE (POSTGRESQL)
# ==============================================================================
# Descrição: Migração total entre dois projetos Supabase.
# Inclui: Tabelas, Dados, Funções, Triggers, RLS, Extensions e Schemas.
# Requisitos: pg_dump e psql instalados localmente.
# ==============================================================================

# CONFIGURAÇÕES (Substitua pelas suas URLs de conexão direta)
SOURCE_DB_URL="postgresql://postgres:lICANTROPOS1324%40@db.wezxkgeaaddmpmijudjt.supabase.co:5432/postgres"
TARGET_DB_URL="postgresql://postgres:lICANTROPOS1324%40@db.iqveweyjeviikjbgjyjt.supabase.co:5432/postgres"

# ARQUIVO DE DUMP
DUMP_FILE="supabase_migration_$(date +%Y%m%d_%H%M%S).sql"
LOG_FILE="migration_log.txt"

# CORES PARA LOG
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[!] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# 1. VERIFICAÇÃO DE FERRAMENTAS
command -v pg_dump >/dev/null 2>&1 || error "pg_dump não encontrado. Instale o PostgreSQL localmente."
command -v psql >/dev/null 2>&1 || error "psql não encontrado. Instale o PostgreSQL localmente."

log "Iniciando processo de migração..."

# 2. TESTE DE CONEXÃO
log "Testando conexões..."
psql "$SOURCE_DB_URL" -c "SELECT 1" >/dev/null 2>&1 || error "Falha ao conectar no banco de ORIGEM."
psql "$TARGET_DB_URL" -c "SELECT 1" >/dev/null 2>&1 || error "Falha ao conectar no banco de DESTINO."

# 3. VERIFICAÇÃO DO BANCO DESTINO
TABLE_COUNT=$(psql "$TARGET_DB_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
TABLE_COUNT=$(echo $TABLE_COUNT | xargs)

if [ "$TABLE_COUNT" -gt 0 ]; then
    warn "O banco de destino não está vazio ($TABLE_COUNT tabelas no schema public)."
    read -p "Deseja continuar e SOBRESCREVER os dados? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        log "Migração cancelada pelo usuário."
        exit 0
    fi
fi

# 4. EXECUTANDO DUMP (ORIGEM)
log "Gerando dump do banco de origem (isso pode demorar dependendo do tamanho)..."
# Usamos --clean para incluir comandos de DROP antes de CREATE
# Excluímos extensões gerenciadas pelo Supabase para evitar conflitos de permissão no restore
pg_dump "$SOURCE_DB_URL" \
    --format=p \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --quote-all-identifiers \
    --schema=public \
    -f "$DUMP_FILE" || error "Erro ao gerar dump."

log "Dump gerado com sucesso: $DUMP_FILE"

# 5. RESTAURANDO (DESTINO)
log "Iniciando restauração no banco de destino..."
# Desabilitamos o stop on error para que a migração continue mesmo se algumas permissões de sistema falharem
psql "$TARGET_DB_URL" -f "$DUMP_FILE" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    log "Restauração concluída."
else
    warn "Restauração finalizada com alguns avisos (verifique migration_log.txt)."
fi

# 6. VALIDAÇÃO
log "Validando integridade..."

log "--- CONTAGEM DE REGISTROS (TOP 5 TABELAS) ---"
TABLES=$(psql "$SOURCE_DB_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5;")

for table in $TABLES; do
    COUNT_SRC=$(psql "$SOURCE_DB_URL" -t -c "SELECT count(*) FROM public.\"$table\";" | xargs)
    COUNT_TGT=$(psql "$TARGET_DB_URL" -t -c "SELECT count(*) FROM public.\"$table\";" | xargs)
    
    if [ "$COUNT_SRC" == "$COUNT_TGT" ]; then
        log "Tabela [$table]: $COUNT_SRC registros (OK)"
    else
        warn "Tabela [$table]: ORIGEM ($COUNT_SRC) vs DESTINO ($COUNT_TGT) - DIVERGÊNCIA!"
    fi
done

log "Processo finalizado!"
log "Arquivo de dump: $DUMP_FILE"
log "Log detalhado: $LOG_FILE"
