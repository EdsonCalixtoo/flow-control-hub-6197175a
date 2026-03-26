
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Edson/Documents/ERPLOVABLE/flow-control-hub-6197175a/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    const warrantyId = '45c8ae05-f12e-4cf2-a577-0443a86837fe';
    const now = new Date().toISOString();
    
    // Check current state
    const { data: w, error: loadError } = await supabase.from('warranties').select('*').eq('id', warrantyId).single();
    if (loadError) { console.error('Load Error:', loadError); return; }
    console.log('Target ID:', warrantyId);
    console.log('Current status:', w.status);
    
    const { count, data, error } = await supabase.from('warranties').update({
        status: 'Garantia finalizada',
        updated_at: now,
        history: [...(w.history || []), { status: 'Garantia finalizada', timestamp: now, user: 'Antigravity AI Fix', note: 'Forcing status' }]
    }).eq('id', warrantyId).select();

    if (error) {
        console.error('ERROR UPDATING:', error);
    } else {
        console.log('ROWS AFFECTED?', data ? data.length : 0);
        if (data && data.length > 0) {
            console.log('New Status successfully set to:', data[0].status);
        } else {
            console.log('No rows updated.');
        }
    }
}
fix();
