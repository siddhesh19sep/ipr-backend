const { ethers } = require("ethers");
const privateKey = "82afb807e5d52688289616a75817237915039fe7f8d06929d166d8a977f49b20";

try {
    const wallet = new ethers.Wallet(privateKey);
    console.log(`Public Address: ${wallet.address}`);
} catch (error) {
    console.error(`Invalid Private Key: ${error.message}`);
}
