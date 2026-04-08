import { updateClientRewardsAuto, fetchClientRewards, calculateClientRanking } from './src/lib/rewardServiceSupabase';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const clientId = 'eb540753-5c32-4db3-8d83-96e9efc6103c';
    console.log(`Updating rewards for client: ${clientId}`);
    
    const rankingBefore = await calculateClientRanking(clientId);
    console.log('Ranking Before Update:', JSON.stringify(rankingBefore, null, 2));

    await updateClientRewardsAuto(clientId);
    console.log('Update finished.');

    const rewardsAfter = await fetchClientRewards(clientId);
    console.log('Rewards After Update:', JSON.stringify(rewardsAfter, null, 2));
}

run().catch(console.error);
