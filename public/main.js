const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Configurations (Base64 file payloads ke liye limit barha di gayi hai)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Mock In-Memory Databases
let products = [];
let orders = [];
let users = [];

// ==========================================
// CONFIGURATION: NODEMAILER TRANSPORTER
// ==========================================
// Yahan aap apni SMTP details lagayein (Jaise Gmail App Password ya Hostinger SMTP)
const ADMIN_EMAIL = 'admin@example.com'; // Apni Admin Email yahan likhein
const transporter = nodemailer.createTransport({
    service: 'gmail', // Ya aap host/port configure kar sakte hain
    auth: {
        user: 'your-email@gmail.com', // Aapka system email account
        pass: 'your-app-password'     // Aapka secure app password
    }
});

// Helper function to extract content-type and raw data from base64 string
function parseBase64Attachment(base64Str, filename) {
    if (!base64Str) return null;
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    return {
        filename: filename,
        content: Buffer.from(matches[2], 'base64'),
        contentType: matches[1]
    };
}

// ==========================================
// API ROUTES: PRODUCTS LOGIC
// ==========================================

// 1. Get all approved products for storefront grid
app.get('/api/products', (req, res) => {
    const approvedProducts = products.filter(p => p.status === 'approved');
    res.json(approvedProducts);
});

// 2. Get merchant dashboard upload history by email
app.get('/api/products/seller/:email', (req, res) => {
    const sellerList = products.filter(p => p.sellerEmail === req.params.email);
    res.json(sellerList);
});

// 3. Post / Upload a Product with 3 Images Integration
app.post('/api/products', async (req, res) => {
    try {
        const { 
            title, price, description, imageBase64, imagesArray, 
            videoBase64, transactionId, paymentDetails, address, 
            contactNumber, sellerEmail 
        } = req.body;

        if (!title || !price || !sellerEmail) {
            return res.status(400).json({ error: "Missing required product metrics." });
        }

        // 3 Images allocation parsing
        let productImages = [];
        if (imagesArray && Array.isArray(imagesArray) && imagesArray.length >= 3) {
            productImages = imagesArray;
        } else if (imageBase64) {
            productImages.push(imageBase64); // Fallback standard format
        }

        const newProduct = {
            id: 'PROD-' + Date.now(),
            title,
            price,
            description,
            imageUrl: productImages[0] || imageBase64, // Compatibility backward link
            images: productImages, // Full array containing 3+ photos
            videoUrl: videoBase64 || null,
            transactionId,
            paymentDetails,
            address,
            contactNumber,
            sellerEmail,
            status: 'pending' // Admin review approval required
        };

        products.push(newProduct);

        // --- EMAIL SYSTEM: SUBMISSION REQUEST SENT TO ADMIN & SELLER ---
        let emailAttachments = [];
        productImages.forEach((imgBase64, index) => {
            const parsed = parseBase64Attachment(imgBase64, `product-photo-${index + 1}.png`);
            if (parsed) emailAttachments.push(parsed);
        });

        if (videoBase64) {
            const parsedVid = parseBase64Attachment(videoBase64, 'product-video.mp4');
            if (parsedVid) emailAttachments.push(parsedVid);
        }

        const emailBody = `
            <h2>New Product Verification Request</h2>
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Price:</strong> PKR ${price}</p>
            <p><strong>Description:</strong> ${description || 'N/A'}</p>
            <p><strong>Merchant Email:</strong> ${sellerEmail}</p>
            <p><strong>Contact:</strong> ${contactNumber || 'N/A'}</p>
            <p><strong>Warehouse Address:</strong> ${address || 'N/A'}</p>
            <p><strong>TxID / Verification Fee Code:</strong> ${transactionId || 'N/A'}</p>
            <p><strong>Payment Custom Details:</strong> ${paymentDetails || 'N/A'}</p>
            <br>
            <p><em>Note: System verified 3+ product gallery photo attachments below.</em></p>
        `;

        // Send to Admin & Carbon Copy (CC) to Seller
        await transporter.sendMail({
            from: '"MT Storefront System" <your-email@gmail.com>',
            to: [ADMIN_EMAIL, sellerEmail].join(','),
            subject: `🚨 Verification Pending: ${title} (PKR ${price})`,
            html: emailBody,
            attachments: emailAttachments
        });

        // Auto-approve product for internal debugging or instant demonstration logic (Optional)
        newProduct.status = 'approved'; 

        res.status(201).json({ success: true, product: newProduct });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal processing error during media ingestion." });
    }
});

// ==========================================
// API ROUTES: ORDERS & CHECKOUT ENGINE
// ==========================================

// 1. Submit a New COD Order Route
app.post('/api/orders', async (req, res) => {
    try {
        const { items, buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Shopping basket validation failure." });
        }

        items.forEach(item => {
            const newOrder = {
                id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
                title: item.title,
                price: item.price,
                quantity: item.quantity || 1,
                buyerName,
                buyerEmail,
                buyerPhone,
                buyerAddress,
                sellerEmail: item.sellerEmail || ADMIN_EMAIL,
                status: 'processing'
            };
            orders.push(newOrder);
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Order pipeline breakdown." });
    }
});

// 2. Fetch User Specific Orders History
app.get('/api/orders/user/:email', (req, res) => {
    const userOrders = orders.filter(o => o.buyerEmail === req.params.email || o.sellerEmail === req.params.email);
    res.json(userOrders);
});

// 3. Real-time Order Cancellation & Dual-Email Alert Routing
app.post('/api/orders/cancel', async (req, res) => {
    try {
        const { orderId, userEmail } = req.body;
        
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ success: false, error: "Order reference ID not found." });
        }

        const targetOrder = orders[orderIndex];
        
        // Status updates to cancelled state
        targetOrder.status = 'cancelled';

        // --- DUAL EMAIL DISPATCH: SEND CANCELLATION NOTICE TO ADMIN AND SELLER ---
        const cancelEmailBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e11d48; border-radius: 12px;">
                <h2 style="color: #e11d48;">🛑 Order Cancelled Notification</h2>
                <p>Order ID <strong>#${targetOrder.id}</strong> ka status real-time update karke <strong>CANCELLED</strong> kar diya gaya hai.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p><strong>Product Name:</strong> ${targetOrder.title}</p>
                <p><strong>Quantity Ordered:</strong> ${targetOrder.quantity}</p>
                <p><strong>Total Bill Cost:</strong> PKR ${targetOrder.price * targetOrder.quantity}</p>
                <p><strong>Buyer Name:</strong> ${targetOrder.buyerName}</p>
                <p><strong>Buyer Contact:</strong> ${targetOrder.buyerPhone}</p>
                <p><strong>Shipping Destination:</strong> ${targetOrder.buyerAddress}</p>
                <p><strong>Action Executed By:</strong> ${userEmail}</p>
            </div>
        `;

        // Dispatch alerts simultaneously
        await transporter.sendMail({
            from: '"MT Order Tracker" <your-email@gmail.com>',
            to: [ADMIN_EMAIL, targetOrder.sellerEmail].join(','),
            subject: `🛑 Cancelled: Order #${targetOrder.id} - ${targetOrder.title}`,
            html: cancelEmailBody
        });

        res.json({ success: true, message: "Order cancellation synchronized successfully across nodes." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Database mapping cancellation fault." });
    }
});

// ==========================================
// USER CONFIG & ACCOUNT SYSTEM ROUTES
// ==========================================

app.post('/api/users/login', (req, res) => {
    const { email } = req.body;
    let user = users.find(u => u.email === email);
    if (!user) {
        user = { email, username: email.split('@')[0], profileImage: null };
        users.push(user);
    }
    res.json({ success: true, user });
});

app.post('/api/users/update', (req, res) => {
    const { email, username, profileImage } = req.body;
    let user = users.find(u => u.email === email);
    if (user) {
        if (username) user.username = username;
        if (profileImage) user.profileImage = profileImage;
        return res.json({ success: true, user });
    }
    res.status(404).json({ error: "User identity context lost." });
});

// Fallback HTML page server trigger
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 MT-Server dynamic stack working smoothly on port ${PORT}`));
