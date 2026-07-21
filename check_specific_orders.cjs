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

const targetOrders = [
    'PED-11128', 'PED-9961', 'PED-10938', 'PED-10897', 'PED-10879', 
    'PED-10688', 'PED-10565', 'PED-10531', 'PED-10313', 'D-2816', 
    'D-3198', '0010', 'D-2745'
];

async function checkSpecificOrders() {
    console.log("Consultando datas dos pedidos das imagens...");
    
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, number, created_at, status')
        .in('number', targetOrders);

    if (ordersError) {
        console.error("Erro ao buscar pedidos:", ordersError);
        return;
    }

    const orderIds = orders.map(o => o.id);
    
    const { data: scans, error: scansError } = await supabase
        .from('barcode_scans')
        .select('order_id, scanned_at, success')
        .in('order_id', orderIds)
        .eq('success', true);
        
    if (scansError) {
        console.error("Erro ao buscar scans:", scansError);
        return;
    }

    const { data: pickups, error: pickupsError } = await supabase
        .from('delivery_pickups')
        .select('order_id, created_at')
        .in('order_id', orderIds);

    const results = [];

    for (const order of orders) {
        const orderScans = scans.filter(s => s.order_id === order.id);
        const orderPickups = pickups?.filter(p => p.order_id === order.id) || [];
        
        let scanDateStr = "NUNCA BIPADO";
        if (orderScans.length > 0) {
            const scanDates = orderScans.map(s => new Date(s.scanned_at));
            const firstScan = new Date(Math.min(...scanDates)).toLocaleString('pt-BR');
            const lastScan = new Date(Math.max(...scanDates)).toLocaleString('pt-BR');
            scanDateStr = firstScan === lastScan ? firstScan : `${firstScan} (último: ${lastScan})`;
        }
        
        let pickupDateStr = "NENHUM";
        if (orderPickups.length > 0) {
             const pickupDates = orderPickups.map(p => new Date(p.created_at));
             pickupDateStr = new Date(Math.max(...pickupDates)).toLocaleString('pt-BR');
        }

        const createdAtStr = new Date(order.created_at).toLocaleString('pt-BR');

        results.push({
            number: order.number,
            status: order.status,
            createdAt: createdAtStr,
            scanDate: scanDateStr,
            pickupDate: pickupDateStr
        });
    }

    // Sort by order number string
    results.sort((a, b) => a.number.localeCompare(b.number));

    console.log("\n=======================================================");
    console.log("INFORMAÇÕES DOS PEDIDOS DAS IMAGENS");
    console.log("=======================================================\n");
    
    results.forEach(r => {
        console.log(`\n📦 Pedido #${r.number} (Status: ${r.status})`);
        console.log(`   Lançado no sistema em: ${r.createdAt}`);
        console.log(`   Bipado na Produção em: ${r.scanDate}`);
        console.log(`   Registro de Entregador: ${r.pickupDate}`);
    });
}

checkSpecificOrders();
