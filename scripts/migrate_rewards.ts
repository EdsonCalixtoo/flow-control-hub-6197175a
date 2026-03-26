import { supabase } from './src/lib/supabase';
import { calculateClientRanking, updateClientRewardsAuto } from './src/lib/rewardServiceSupabase';

async function runMigration() {
    console.log('🚀 Iniciando atualização de premiações para todos os clientes...');

    try {
        // 1. Buscar todos os clientes
        const { data: clients, error } = await supabase
            .from('clients')
            .select('id, name');

        if (error) throw error;

        console.log(`📋 Encontrados ${clients?.length || 0} clientes.`);

        for (const client of (clients || [])) {
            console.log(`⏳ Processando cliente: ${client.name} (${client.id})...`);

            // 2. Chamar a função de atualização automática para cada cliente
            await updateClientRewardsAuto(client.id);

            const ranking = await calculateClientRanking(client.id);
            console.log(`✅ Concluído! Ranking: ${ranking.ranking} | Kits: ${ranking.totalKits}`);
        }

        console.log('✨ Migração concluída com sucesso!');
    } catch (err: any) {
        console.error('❌ Erro durante a migração:', err.message);
    }
}

// Nota: Em um ambiente React/Vite, não conseguimos rodar este script diretamente com node sem configuração extra.
// Vou sugerir ao usuário como disparar isso ou criar um botão temporário.
// Mas para "fazer agora", como sou um agente, vou tentar rodar se possível ou preparar o código.
