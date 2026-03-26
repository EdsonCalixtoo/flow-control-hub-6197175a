import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const kits = [
    {
        name: '✅ KIT SPRINTER .N',
        description: '1 – Chicote, 1 – Suporte da coluna, 1 – Courinho com capinha, 3 – Enforca gato pequeno, 1 – Fusível, 1 – Trava em U, 1 – Parafuso Allen, 5 – Espaçador 40mm, 2 – Espaçador 60mm, 2 – Adesivos, 1 – Garantia, 1 – Colar azul, 1 – Cremalheira 1,20m'
    },
    {
        name: '✅ KIT DAILY .N',
        description: '1 – Chicote, 1 – Suporte da coluna, 1 – Courinho com capinha, 3 – Enforca gato pequeno, 1 – Fusível, 1 – Trava em U, 1 – Parafuso Allen, 5 – Espaçador 40mm, 2 – Espaçador 60mm, 2 – Adesivos, 1 – Garantia, 1 – Colar azul, 1 – Cremalheira 1,20m'
    },
    {
        name: '✅ KIT DUCATO',
        description: '6 – Espaçador 40mm, 1 – Porta fusível, 1 – Parafuso Allen, 1 – Trava cabo, 3 – Enforca gato, 1 – Courinho com capinha, 1 – Suporte da coluna, 3 – Adesivos, 1 – Garantia, 1 – Cremalheira 1,10m, 1 – Chicote'
    },
    {
        name: '✅ KIT BOXER',
        description: '6 – Espaçador 40mm, 1 – Porta fusível, 1 – Parafuso Allen, 1 – Trava cabo, 3 – Enforca gato, 1 – Courinho com capinha, 1 – Suporte da coluna, 3 – Adesivos, 1 – Garantia, 1 – Cremalheira 1,10m, 1 – Chicote'
    },
    {
        name: '✅ KIT JUMPER',
        description: '6 – Espaçador 40mm, 1 – Porta fusível, 1 – Parafuso Allen, 1 – Trava cabo, 3 – Enforca gato, 1 – Courinho com capinha, 1 – Suporte da coluna, 3 – Adesivos, 1 – Garantia, 1 – Cremalheira 1,10m, 1 – Chicote'
    },
    {
        name: '✅ KIT KOMBI',
        description: '6 – Espaçador 40mm, 1 – Porta fusível, 1 – Parafuso Allen, 1 – Trava cabo, 3 – Enforca gato, 1 – Courinho com capinha, 1 – Suporte da coluna, 3 – Adesivos, 1 – Garantia, 1 – Cremalheira 1,10m, 1 – Chicote'
    },
    {
        name: '✅ KIT MASTER .N',
        description: '1 – Chicote, 1 – Suporte da coluna, 1 – Courinho com capinha, 3 – Enforca gato pequeno, 1 – Fusível, 1 – Parafuso Allen, 5 – Espaçador 40mm, 2 – Espaçador 60mm, 2 – Adesivos, 1 – Garantia, 1 – Colar azul, 1 – Cremalheira 1,20m'
    },
    {
        name: '✅ KIT MASTER .A',
        description: '1 – Chicote, 1 – Suporte da coluna, 1 – Courinho com capinha, 3 – Enforca gato pequeno, 1 – Fusível, 1 – Parafuso Allen, 1 – Trava cabo, 5 – Espaçador pequeno, 2 – Adesivos, 1 – Garantia, 1 – Colar azul, 1 – Cremalheira 1,00m'
    },
    {
        name: '✅ KIT SPRINTER .A',
        description: '1 – Chicote, 1 – Suporte da coluna, 1 – Courinho com capinha, 3 – Enforca gato pequeno, 1 – Fusível, 1 – Parafuso Allen, 1 – Trava cabo, 5 – Espaçador pequeno, 2 – Adesivos, 1 – Garantia, 1 – Colar azul, 1 – Cremalheira 0,90m'
    }
];

async function seedProducts() {
    console.log('Iniciando cadastro de produtos...');

    for (const kit of kits) {
        const sku = kit.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();

        const { data, error } = await supabase.from('products').insert([
            {
                name: kit.name,
                description: kit.description,
                sku: sku,
                category: 'Kits',
                unit_price: 0,
                cost_price: 0,
                stock_quantity: 1000,
                min_stock: 100,
                unit: 'un',
                status: 'ativo'
            }
        ]);

        if (error) {
            console.error(`Erro ao cadastrar ${kit.name}:`, error.message);
        } else {
            console.log(`✅ Cadastrado: ${kit.name}`);
        }
    }

    console.log('Finalizado!');
}

seedProducts();
