const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const PORT = process.env.PORT || 5000;

// Vercel par write karne ke liye /tmp directory use hoti hai
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'Data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMIN_EMAIL = 'lagharitahir08@gmail.com';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));

app.use(express.static(__dirname)); 
app.use(express.static(path.join(__dirname, 'public')));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'lagharitahir08@gmail.com',
        pass: 'nvur uskc qntm hcpy'
    }
});

const sendHtmlEmail = (to, subject, htmlContent) => {
    if (!to) return;
    const mailOptions = {
        from: `"MT Store Global" <lagharitahir08@gmail.com>`,
        to: to,
        subject: subject,
        html: htmlContent
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log("❌ Email Sending Failed: ", error);
        else console.log("🚀 Email Sent Successfully: " + info.response);
    });
};

// ==========================================
// 👤 USER PROFILE & AUTHENTICATION APIS
// ==========================================
app.post('/api/users/login', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        let user = users.find(u => u.email === email.toLowerCase());

        if (!user) {
            user = {
                email: email.toLowerCase(),
                username: email.split('@')[0],
                profileImage: ''
            };
            users.push(user);
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        }
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: "Authentication system failure" });
    }
});

app.post('/api/users/update', (req, res) => {
    const { email, username, profileImage } = req.body;
    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const index = users.findIndex(u => u.email === email.toLowerCase());

        if (index === -1) return res.status(404).json({ error: "User profile not found" });

        if (username) users[index].username = username;
        if (profileImage) users[index].profileImage = profileImage;

        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        res.json({ success: true, user: users[index] });
    } catch (e) {
        res.status(500).json({ error: "Failed to update profile settings" });
    }
});

// ==========================================
// 🛠️ PRODUCTS & GLOBAL ORDERS PIPELINE
// ==========================================
app.get('/api/products', (req, res) => {
    try {
        const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
        res.json(products.filter(p => p.status === 'approved'));
    } catch (e) {
        res.status(500).json({ error: "Failed to read products" });
    }
});

app.get('/api/products/seller/:email', (req, res) => {
    try {
        const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
        const sellerProducts = products.filter(p => p.sellerEmail && p.sellerEmail.toLowerCase() === req.params.email.toLowerCase());
        res.json(sellerProducts);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch seller products" });
    }
});

app.get('/api/orders/user/:email', (req, res) => {
    try {
        const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
        const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
        
        const userOrders = orders.filter(o => o.buyerEmail.toLowerCase() === req.params.email.toLowerCase())
            .map(order => {
                const prod = products.find(p => p.id === order.productId);
                return {
                    ...order,
                    productImage: prod ? prod.imageUrl : ''
                };
            });
        res.json(userOrders);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

app.post('/api/products', (req, res) => {
    const { title, price, description, category, imageBase64, videoBase64, paymentDetails, address, contactNumber, sellerEmail, transactionId } = req.body;
    if (!title || !price || !imageBase64 || !paymentDetails || !transactionId) {
        return res.status(400).json({ error: "Required details or verification transaction is missing." });
    }

    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    const productId = Date.now().toString();

    const newProduct = {
        id: productId,
        title, price: parseFloat(price), description, category: category || 'General',
        imageUrl: imageBase64, videoUrl: videoBase64 || '',
        paymentDetails, address, contactNumber, sellerEmail, transactionId,
        status: 'pending', createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));

    const baseUrl = req.headers.host ? `https://${req.headers.host}` : `http://localhost:${PORT}`;
    const approveUrl = `${baseUrl}/api/products/approve/${productId}`;
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; max-width: 600px; background-color: #0f172a; color: #ffffff;">
            <h2 style="color: #f97316; margin-bottom: 4px;">💼 New Store Submission Pending</h2>
            <p><strong>Seller:</strong> ${sellerEmail}</p>
            <p><strong>Product:</strong> ${title}</p>
            <p><strong>TXID:</strong> <span style="background-color: #1e293b; padding: 4px 8px; border-radius: 4px; color: #facc15;">${transactionId}</span></p>
            <div style="margin: 24px 0; text-align: center;">
                <a href="${approveUrl}" style="background-color: #22c55e; color: #000000; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">
                    ✅ Verify & Approve Product Live
                </a>
            </div>
        </div>
    `;
    sendHtmlEmail(ADMIN_EMAIL, `🚨 Approve ${title} from ${sellerEmail}`, emailHtml);
    res.status(201).json({ message: "Product listed for admin review." });
});

app.get('/api/products/approve/:id', (req, res) => {
    try {
        const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
        const index = products.findIndex(p => p.id === req.params.id);
        if (index === -1) return res.send("<h1>Product not found!</h1>");

        products[index].status = 'approved';
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));

        sendHtmlEmail(products[index].sellerEmail, `🚀 Product Live!`, `<h2>Your product "${products[index].title}" is live now.</h2>`);
        res.send(`<h1 style="text-align:center; margin-top:50px; color:#22c55e;">✅ Product Approved Successfully!</h1>`);
    } catch (e) {
        res.send("<h1>Server Error processing approval.</h1>");
    }
});

app.post('/api/orders', (req, res) => {
    const { items, buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;
    if (!items || items.length === 0 || !buyerEmail) return res.status(400).json({ error: "Incomplete order details." });

    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));

    items.forEach(item => {
        const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        
        orders.push({
            id: orderId, productId: item.id, title: item.title, price: item.price, quantity: item.quantity,
            buyerName, buyerEmail: buyerEmail.toLowerCase(), buyerPhone, buyerAddress,
            status: 'Processing', createdAt: new Date().toISOString()
        });

        const linkedProduct = products.find(p => p.id === item.id);
        const sellerTargetEmail = linkedProduct ? linkedProduct.sellerEmail : null;

        const detailedOrderHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; max-width: 600px; background-color: #0b0f19; color: #f3f4f6;">
                <h2 style="color: #f97316; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-top: 0;">📦 Order Dispatch Report: ${orderId}</h2>
                <h3 style="color: #38bdf8; margin-bottom: 8px;">🛒 Product Details</h3>
                <p style="margin: 4px 0;"><strong>Item Title:</strong> ${item.title}</p>
                <p style="margin: 4px 0;"><strong>Quantity Ordered:</strong> ${item.quantity}</p>
                <p style="margin: 4px 0;"><strong>Unit Price:</strong> PKR ${item.price}</p>
                <p style="margin: 4px 0;"><strong>Total Bill:</strong> <span style="color: #facc15; font-weight: bold;">PKR ${item.price * item.quantity}</span></p>
                <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-top: 20px;">
                    <h3 style="color: #4ade80; margin-top: 0; margin-bottom: 8px;">📋 Verified Buyer Shipping Information</h3>
                    <p style="margin: 4px 0;"><strong>Full Name:</strong> ${buyerName}</p>
                    <p style="margin: 4px 0;"><strong>Active Email:</strong> ${buyerEmail}</p>
                    <p style="margin: 4px 0;"><strong>Contact Number (COD):</strong> ${buyerPhone}</p>
                    <p style="margin: 4px 0; line-height: 1.4;"><strong>Complete Shipping Address:</strong> ${buyerAddress}</p>
                </div>
            </div>
        `;

        sendHtmlEmail(buyerEmail, `🛍️ MT Store Order Confirmation: ${orderId}`, detailedOrderHtml);
        sendHtmlEmail(ADMIN_EMAIL, `🔔 Platform Notification: Order ${orderId}`, detailedOrderHtml);
        if (sellerTargetEmail) {
            sendHtmlEmail(sellerTargetEmail, `💼 New Order Received for Your Product: ${orderId}`, detailedOrderHtml);
        }
    });

    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    res.json({ message: "Order places successfully!" });
});

// Local test port active logic
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 MT Store Engine Active on http://localhost:${PORT}`);
    });
}

// Vercel deployment serverless export configuration
module.exports = app;
