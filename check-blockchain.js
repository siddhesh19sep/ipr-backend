const { ethers } = require("ethers");
require("dotenv").config();

async function checkBlockchain() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    const contractAddress = process.env.SMART_CONTRACT_ADDRESS;

    console.log("--- Blockchain Configuration Check ---");
    console.log(`RPC URL: ${rpcUrl?.includes("YOUR_ALCHEMY_KEY") ? "MISSING (Placeholder detected)" : "Present"}`);
    console.log(`Private Key: ${privateKey?.includes("YOUR_ETHEREUM_PRIVATE_KEY") ? "MISSING (Placeholder detected)" : "Present"}`);
    console.log(`Contract Address: ${contractAddress?.includes("YOUR_DEPLOYED_CONTRACT_ADDRESS") ? "MISSING (Placeholder detected)" : "Present"}`);

    if (!rpcUrl || rpcUrl.includes("YOUR")) return console.error("Error: BLOCKCHAIN_RPC_URL is not set correctly in .env");
    if (!privateKey || privateKey.includes("YOUR")) return console.error("Error: BLOCKCHAIN_PRIVATE_KEY is not set correctly in .env");

    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        console.log("Successfully connected to RPC.");

        const balance = await provider.getBalance(process.env.BLOCKCHAIN_PRIVATE_KEY_DERIVED_ADDRESS || "0x8a160Fd8831e46AD044535dCbF16E3108096a111");
        console.log(`Wallet Balance: ${ethers.formatEther(balance)} MATIC`);

        if (balance === 0n) {
            console.warn("Warning: Wallet balance is 0. You need Amoy MATIC to deploy or register IP.");
            console.log("Get free MATIC here: https://faucet.polygon.technology/");
        }

        if (contractAddress && !contractAddress.includes("YOUR")) {
            const code = await provider.getCode(contractAddress);
            if (code === "0x") {
                console.error("Error: No contract code found at the provided address. Is it deployed on the correct network?");
            } else {
                console.log("Contract detected at the provided address!");
            }
        } else {
            console.log("Contract Address not provided or is placeholder. Ready for deployment.");
        }

    } catch (error) {
        console.error("Connectivity Test Failed:", error.message);
        if (error.message.includes("401")) {
            console.error("Tip: Your Alchemy/Infura key might be invalid or expired.");
        }
    }
}

checkBlockchain();
