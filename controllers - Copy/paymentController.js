// Mocking Razorpay for testing purposes
// Normally this would use the real 'razorpay' package and crypto

exports.createOrder = async (req, res) => {
    try {
        const { amount, currency = "INR" } = req.body;

        if (!amount) {
            return res.status(400).json({ error: "Amount is required to create a Razorpay Order." });
        }

        // Return a mock order
        const mockOrder = {
            id: `order_mock_${Math.floor(Math.random() * 1000000)}`,
            entity: "order",
            amount: amount * 100,
            amount_paid: 0,
            amount_due: amount * 100,
            currency: currency,
            receipt: `receipt_order_${Math.floor(Math.random() * 10000)}`,
            offer_id: null,
            status: "created",
            attempts: 0,
            notes: [],
            created_at: Math.floor(Date.now() / 1000)
        };

        res.status(200).json(mockOrder);
    } catch (error) {
        console.error("Mock Razorpay Order Creation Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.verifyPayment = (req, res) => {
    try {
        // ALWAYS verify the payment in mock mode
        return res.status(200).json({ message: "Mock payment verified successfully", success: true });
    } catch (error) {
        console.error("Mock Razorpay Signature Verification Error:", error);
        res.status(500).json({ error: error.message });
    }
};
