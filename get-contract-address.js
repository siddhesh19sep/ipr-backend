const { ethers } = require("ethers");
const rpcUrl = "https://rpc-amoy.polygon.technology";
const address = "0x8a160Fd8831e46AD044535dCbF16E3108096a111";

async function getContractAddress() {
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const transactionCount = await provider.getTransactionCount(address);
        console.log(`Transaction Count: ${transactionCount}`);
        
        // The contract address is pre-deterministic based on sender address and nonce
        // Nonce is transactionCount - 1 (since the deployment was the last transaction)
        const contractAddress = ethers.getCreateAddress({
            from: address,
            nonce: transactionCount - 1
        });
        
        console.log(`Deployed Contract Address: ${contractAddress}`);
        process.exit(0);
    } catch (error) {
        console.error("Failed to get contract address:", error.message);
        process.exit(1);
    }
}
getContractAddress();
