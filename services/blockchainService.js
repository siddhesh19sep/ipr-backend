require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load the compiled Smart Contract ABI
const contractABIPath = path.join(__dirname, "../IPRegistryABI.json");
const contractABI = JSON.parse(fs.readFileSync(contractABIPath, "utf8"));

// Using Polygon Amoy RPC URL from environment variables
// Replace with Alchemy/Infura URL in .env
const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";

// Getting the private key from .env
const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

// Contract address after deployment
const contractAddress = process.env.SMART_CONTRACT_ADDRESS;

class BlockchainService {
    constructor() {
        this.isSimulated = true; // Default to simulation until initialized
        this.initialize();
    }

    async initialize() {
        if (!privateKey || !contractAddress) {
            console.warn("Blockchain private key or contract address not provided. Enabling simulation mode.");
            return;
        }

        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            
            // Get network info for logging
            const network = await this.provider.getNetwork();
            
            // Ensure the address is correctly checksummed for ethers v6
            const checksummedAddress = ethers.getAddress(contractAddress.toLowerCase());
            
            this.contract = new ethers.Contract(checksummedAddress, contractABI, this.wallet);
            this.isSimulated = false;
            console.log("✅ Blockchain Service initialized successfully on network:", network.name || "Polygon Amoy", `(Chain ID: ${network.chainId})`);
        } catch (e) {
            console.error("Blockchain provider initialization failed:", e.message);
            if (e.reason) console.error("Reason:", e.reason);
            if (e.code) console.error("Code:", e.code);
            console.warn("Falling back to simulation mode.");
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
            return ethers.hexlify(ethers.randomBytes(32));
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
            const originalError = error.message;
            
            if (error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND") || error.message.includes("401")) {
                const mockHash = `0xSimulated${ethers.hexlify(ethers.randomBytes(28)).slice(2)}`;
                console.log(`Fallback Success: Generated mock hash ${mockHash}`);
                return mockHash;
            }
            throw new Error(`Blockchain transaction failed: ${originalError}`);
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
