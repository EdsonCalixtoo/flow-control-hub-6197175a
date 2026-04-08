import { calculateClientRanking } from '../src/lib/rewardServiceSupabase';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const clientId = 'eb540753-5c32-4db3-8d83-96e9efc6103c';
    console.log(`Checking ranking for client: ${clientId}`);
    const ranking = await calculateClientRanking(clientId);
    console.log('Result:', JSON.stringify(ranking, null, 2));
}

run().catch(console.error);
