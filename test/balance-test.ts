import dotenv from 'dotenv';
import { FarcasterProvider } from '../src/providers/farcaster/farcasterProvider';

// Load environment variables from .env file
dotenv.config();

async function testBalanceLookup() {
    const provider = new FarcasterProvider();
    
    try {
        console.log('Testing balance lookup for username: vamsireddy');
        
        // First API call: Search user by username
        console.log('\n1. Searching user by username:');
        console.log('API Call: client.searchUser({ q: "vamsireddy", limit: 1 })');
        
        // Use the public getUserProfile method which internally uses searchUser
        const profile = await provider.getUserProfile('vamsireddy');
        console.log('Profile Response:', JSON.stringify(profile, null, 2));
        
        // Second API call: Fetch user balance using the FID from profile
        console.log('\n2. Fetching user balance:');
        console.log(`API Call: client.fetchUserBalance({ fid: ${profile.id}, networks: ['base'] })`);
        
        const balance = await provider.getUserBalance(profile.id);
        
        // Log raw response
        console.log('\nRaw Balance Response:');
        console.log(JSON.stringify(balance, null, 2));
        
        // Format and log human-readable response
        console.log('\nFormatted Balance Response:');
        if (!balance.address_balances || balance.address_balances.length === 0) {
            console.log('No verified addresses found for this user.');
        } else {
            balance.address_balances.forEach((addrBalance: any) => {
                const verifiedAddress = addrBalance.verified_address;
                const tokenBalances = addrBalance.token_balances || [];
                
                console.log(`Base Network Address: ${verifiedAddress.address}`);
                console.log('Token Balances:');
                
                if (tokenBalances.length === 0) {
                    console.log('- No token balances found');
                } else {
                    tokenBalances.forEach((tokenBalance: any) => {
                        const token = tokenBalance.token;
                        const balance = tokenBalance.balance;
                        
                        console.log(`- ${token.symbol}: ${balance.in_token.toFixed(4)} (≈ $${balance.in_usdc.toFixed(2)} USDC)`);
                    });
                }
                console.log('');
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testBalanceLookup(); 