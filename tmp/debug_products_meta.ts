import { createClient } from '@supabase/supabase-client';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const main = async () => {
    const { data: orders, error } = await supabase.from('orders').select('*').limit(100);
    if (error) { console.error(error); return; }

    const sample = orders.flatMap(o => o.items || []);
    
    console.log("Exemplos de Produtos e Atributos:");
    sample.slice(0, 50).forEach(i => {
        console.log(`- ${i.product} | Price: ${i.unitPrice} | Total: ${i.total} | Sensor: ${i.sensorType} | Reward: ${i.isReward}`);
    });
};

main();
