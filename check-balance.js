const { ethers } = require("ethers");
const rpcUrl = "https://rpc-amoy.polygon.technology";
const address = "0x8a160Fd8831e46AD044535dCbF16E3108096a111";

async function checkBalance() {
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const balance = await provider.getBalance(address);
        console.log(`Balance: ${ethers.formatEther(balance)} MATIC`);
        process.exit(0);
    } catch (error) {
        console.error("Failed to check balance:", error.message);
        process.exit(1);
    }
}
checkBalance();
