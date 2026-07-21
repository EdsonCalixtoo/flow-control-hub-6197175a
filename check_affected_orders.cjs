const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load env vars manually
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

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    console.log("Consultando entregas (delivery_pickups)...");
    const { data: pickups, error: pickupError } = await supabase
        .from('delivery_pickups')
        .select('order_id, order_number, created_at')
        .order('created_at', { ascending: false })
        .limit(2000);

    if (pickupError) {
        console.error("Erro ao buscar pickups:", pickupError);
        return;
    }

    const orderIds = pickups.map(p => p.order_id);
    const uniqueIds = [...new Set(orderIds)];

    console.log(`Encontrados ${uniqueIds.length} pedidos únicos com registro de entrega.`);
    
    // Fetch orders in chunks to avoid URL too long
    const affectedOrders = [];
    
    for (let i = 0; i < uniqueIds.length; i += 100) {
        const chunk = uniqueIds.slice(i, i + 100);
        const { data: orders, error: orderError } = await supabase
            .from('orders')
            .select('id, number, status')
            .in('id', chunk);
            
        if (orderError) {
            console.error("Erro ao buscar pedidos:", orderError);
            continue;
        }
        
        for (const order of orders) {
            if (order.status !== 'retirado_entregador' && order.status !== 'extraviado') {
                affectedOrders.push(order);
            }
        }
    }

    console.log("\n=============================================");
    console.log("PEDIDOS QUE FORAM ENTREGUES MAS VOLTARAM DE STATUS:");
    console.log("=============================================\n");
    
    if (affectedOrders.length === 0) {
        console.log("Nenhum pedido encontrado com esse problema!");
    } else {
        affectedOrders.forEach(o => {
            console.log(`- Pedido #${o.number} (Status Atual: ${o.status})`);
        });
        console.log(`\nTotal afetado: ${affectedOrders.length} pedidos.`);
    }
}

checkOrders();
