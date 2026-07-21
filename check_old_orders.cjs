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

async function checkOldOrders() {
    console.log("Buscando todos os pedidos liberados ou finalizados na produção (potenciais pendentes em Entregadores)...");
    
    // Status que aparecem em Entregadores como "Pendente" (assumindo que não têm delivery_pickup)
    const pendingStatuses = ['produto_liberado', 'producao_finalizada'];
    
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, number, status, created_at')
        .in('status', pendingStatuses);

    if (ordersError) {
        console.error("Erro ao buscar pedidos:", ordersError);
        return;
    }

    console.log(`Encontrados ${orders.length} pedidos nesses status.`);
    
    // Pegar as leituras de código de barras para esses pedidos
    const orderIds = orders.map(o => o.id);
    const affectedOrders = [];
    
    for (let i = 0; i < orderIds.length; i += 100) {
        const chunk = orderIds.slice(i, i + 100);
        
        const { data: scans, error: scansError } = await supabase
            .from('barcode_scans')
            .select('order_id, scanned_at, success')
            .in('order_id', chunk)
            .eq('success', true);
            
        if (scansError) {
            console.error("Erro ao buscar scans:", scansError);
            continue;
        }

        const { data: pickups, error: pickupsError } = await supabase
            .from('delivery_pickups')
            .select('order_id')
            .in('order_id', chunk);

        const pickupSet = new Set(pickups?.map(p => p.order_id) || []);

        for (const orderId of chunk) {
            // Se tiver pickup, ele está em "Retirados", não "Pendentes"
            if (pickupSet.has(orderId)) continue;

            const orderScans = scans.filter(s => s.order_id === orderId);
            if (orderScans.length > 0) {
                // Acha a data do scan mais antigo
                const firstScanDate = new Date(Math.min(...orderScans.map(s => new Date(s.scanned_at).getTime())));
                const scanMonth = firstScanDate.getMonth() + 1; // 0-indexed
                const scanYear = firstScanDate.getFullYear();
                
                // Se foi escaneado antes de Junho de 2026 (ou no mês 4 como o usuário disse)
                if (scanYear < 2026 || (scanYear === 2026 && scanMonth <= 5)) {
                    const order = orders.find(o => o.id === orderId);
                    affectedOrders.push({
                        number: order.number,
                        status: order.status,
                        scanDate: firstScanDate.toLocaleDateString('pt-BR')
                    });
                }
            }
        }
    }

    // Sort by date oldest first
    affectedOrders.sort((a, b) => {
        const [dA, mA, yA] = a.scanDate.split('/');
        const [dB, mB, yB] = b.scanDate.split('/');
        return new Date(`${yA}-${mA}-${dA}`).getTime() - new Date(`${yB}-${mB}-${dB}`).getTime();
    });

    console.log("\n=======================================================");
    console.log("PEDIDOS ANTIGOS (ATÉ MAIO/2026) PENDENTES EM ENTREGADORES");
    console.log("=======================================================\n");
    
    if (affectedOrders.length === 0) {
        console.log("Nenhum pedido antigo encontrado!");
    } else {
        affectedOrders.forEach(o => {
            console.log(`- Pedido #${o.number} | Status: ${o.status} | Liberado na Produção em: ${o.scanDate}`);
        });
        console.log(`\nTotal: ${affectedOrders.length} pedidos.`);
    }
}

checkOldOrders();
