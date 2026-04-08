import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const isKit = (item: any) => {
    const productName = (item.product || '').toUpperCase();
    if (item.sensorType) return true;
    if (productName.includes('KIT')) return true;
    return false;
};

async function run() {
    const clientId = 'eb540753-5c32-4db3-8d83-96e9efc6103c';
    console.log(`Checking ranking for client: ${clientId}`);
    
    const confirmedStatuses = [
        'aprovado_financeiro',
        'aguardando_producao',
        'em_producao',
        'producao_finalizada',
        'produto_liberado',
        'retirado_entregador'
    ];

    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', clientId)
        .in('status', confirmedStatuses);

    if (error) throw error;

    console.log(`Found ${orders.length} orders.`);

    let totalKits = 0;
    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;

    orders.forEach(order => {
        console.log(`Order: ${order.number}, status: ${order.status}, created_at: ${order.created_at}`);
        (order.items || []).forEach((item: any) => {
            if (!isKit(item) || item.isReward) {
                console.log(` - Skipping item: ${item.product} (isKit: ${isKit(item)}, isReward: ${item.isReward})`);
                return;
            }

            const qty = item.quantity;
            const price = item.unitPrice;
            console.log(` - Item: ${item.product}, quantity: ${qty}, unitPrice: ${price}`);

            totalKits += qty;
            tier1Count += qty;

            const promoStartDate = new Date('2026-04-01T00:00:00Z');
            const orderDate = new Date(order.created_at); // Use data.created_at directly
            
            if (orderDate >= promoStartDate) {
                if (price >= 1400 && price <= 1650) {
                    tier2Count += qty;
                    console.log(`   + Added to Tier 2 (New Rule)`);
                }
            } else {
                if (price >= 1550 && price <= 1650) {
                    tier2Count += qty;
                    console.log(`   + Added to Tier 2 (Legacy Rule)`);
                }
            }

            if (price >= 1150 && price <= 1350) {
                tier3Count += qty;
                console.log(`   + Added to Tier 3`);
            }
        });
    });

    console.log('Final Totals:');
    console.log(`Total Kits: ${totalKits}`);
    console.log(`Tier 1: ${tier1Count}`);
    console.log(`Tier 2: ${tier2Count}`);
    console.log(`Tier 3: ${tier3Count}`);
}

run().catch(console.error);
