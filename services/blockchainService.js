require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load the compiled Smart Contract ABI
const contractABIPath = path.join(__dirname, "../IPRegistryABI.json");
const contractABI = JSON.parse(fs.readFileSync(contractABIPath, "utf8"));

// Using local Hardhat network for this scenario
// You would replace this with Alchemy/Infura URL for Polygon/Ethereum
const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";

// Getting the private key from .env (Use Account 0 from Hardhat node)
const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

// Contract address after deployment
const contractAddress = process.env.SMART_CONTRACT_ADDRESS;

class BlockchainService {
    constructor() {
        if (!privateKey || !contractAddress) {
            console.warn("Blockchain private key or contract address not provided. Blockchain features may not work.");
            return;
        }

        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
            this.isSimulated = false;
        } catch (e) {
            console.error("Blockchain provider initialization failed. Falling back to simulation mode.");
            this.isSimulated = true;
        }
    }

    /**
     * Registers the IP Hash on the blockchain
     * @param {string} fileHash The SHA-256 hash of the IP file
     * @returns {Promise<string>} The Transaction Hash (txHash)
     */
    async registerIPHash(fileHash) {
        if (this.isSimulated) {
            console.log("SIMULATION MODE: Generating mock transaction hash...");
            return `0x${crypto.randomBytes(32).toString('hex')}`;
        }

        if (!this.contract) {
            throw new Error("Blockchain contract is not initialized.");
        }

        console.log(`Sending IP Hash to Blockchain: ${fileHash}`);

        try {
            // Call the smart contract function
            const txResponse = await this.contract.registerIP(fileHash);
            console.log(`Transaction submitted! Hash: ${txResponse.hash}`);
            const receipt = await txResponse.wait(1);
            return receipt.hash;
        } catch (error) {
            console.error("Error registering IP on blockchain. Trying simulation fallback...", error);
            if (error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
                const mockHash = `0xSimulated${crypto.randomBytes(28).toString('hex')}`;
                console.log(`Fallback Success: Generated mock hash ${mockHash}`);
                return mockHash;
            }
            throw new Error("Blockchain transaction failed: " + error.message);
        }
    }

    /**
     * Verifies if a hash is registered and retrieves its details
     * @param {string} fileHash 
     */
    async verifyIPHash(fileHash) {
        if (!this.contract) return null;

        try {
            const result = await this.contract.getIPRecord(fileHash);
            return {
                owner: result[0],
                fileHash: result[1],
                timestamp: result[2].toString(),
                isRegistered: result[3]
            };
        } catch (error) {
            console.error("Error verifying IP on blockchain:", error);
            return null;
        }
    }
}

module.exports = new BlockchainService();
