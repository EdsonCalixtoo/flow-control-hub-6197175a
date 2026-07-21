const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ordersToFix = [
    // Os 14 afetados pelo bug da Garantia (já tinham registro)
    'PED-11078', 'PED-10619', 'PED-10622', 'PED-10406', 
    'PED-10210', 'PED-10064', 'G-2668', 'PED-10016', 
    'PED-10072', 'PED-9932', 'D-2983', 'G-2771', 
    'G-3699', 'PED-10028',
    // Os 2 antigos de Maio sem registro
    'PED-10313', 'PED-10531'
];

async function fixOrders() {
    console.log(`Corrigindo ${ordersToFix.length} pedidos para o status 'retirado_entregador'...`);
    
    const { data, error } = await supabase
        .from('orders')
        .update({ status: 'retirado_entregador' })
        .in('number', ordersToFix)
        .select('number, status');
        
    if (error) {
        console.error("Erro ao atualizar pedidos:", error);
        return;
    }
    
    console.log(`\nSUCESSO! Foram corrigidos ${data.length} pedidos:`);
    data.forEach(o => {
        console.log(`✅ Pedido ${o.number} agora está como ${o.status}`);
    });
}

fixOrders();
