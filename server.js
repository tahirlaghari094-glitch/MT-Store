const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Databases
let products = [];
let orders = [];
let messages = []; // { id, userEmail, userMessage, adminReply, createdAt }
let userProfiles = {}; // { email: { name, photo, phone } }

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@mtstore.com"; 

// Email Transporter Config
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Helper function to send email safely
async function sendEmail(to, subject, html) {
    try {
        await emailTransporter.sendMail({
            from: '"MT Store" <no-reply@mtstore.com>',
            to,
            subject,
            html
        });
    } catch (err) {
        console.error("Email send error:", err);
    }
}

// --- PRODUCT ROUTES ---

app.get('/api/products', (req, res) => {
    const liveProducts = products.filter(p => p.status === 'approved');
    res.json(liveProducts);
});

app.get('/api/products/seller/:email', (req, res) => {
    const sellerProducts = products.filter(p => p.sellerEmail === req.params.email);
    res.json(sellerProducts);
});

app.post('/api/products', async (req, res) => {
    try {
        const { title, price, description, category, images, videoUrl, sellerEmail, sellerPhone, easypaisaTrxId } = req.body;

        const newProduct = {
            id: 'PROD-' + Date.now(),
            title,
            price,
            description,
            category,
            images: images || [],
            imageUrl: (images && images.length > 0) ? images[0] : '',
            videoUrl: videoUrl || null,
            sellerEmail,
            sellerPhone,
            easypaisaTrxId,
            status: 'pending',
            comments: [],
            createdAt: new Date().toISOString()
        };

        products.push(newProduct);

        const host = req.get('host');
        const protocol = req.protocol;
        const approvalLink = `${protocol}://${host}/api/products/approve/${newProduct.id}`;

        const adminEmailHTML = `
            <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #ffffff; padding: 25px; border-radius: 16px; max-width: 600px; margin: auto; border: 1px solid #1e293b;">
                <h2 style="color: #f97316; margin-top: 0;">📦 New Product Approval Request</h2>
                <p style="color: #94a3b8; font-size: 13px;">A vendor has submitted a product listing requiring approval.</p>
                <hr style="border-color: #1e293b; margin: 15px 0;">
                
                <h3 style="color: #f97316; font-size: 14px;">🛍️ Product Details</h3>
                <p><strong>Title:</strong> ${newProduct.title}</p>
                <p><strong>Price:</strong> PKR ${newProduct.price}</p>
                <p><strong>Category:</strong> ${newProduct.category}</p>
                <p><strong>Description:</strong> ${newProduct.description}</p>
                
                <h3 style="color: #f97316; font-size: 14px; margin-top: 20px;">👤 Vendor Credentials</h3>
                <p><strong>Seller Email:</strong> ${newProduct.sellerEmail}</p>
                <p><strong>Seller Phone:</strong> ${newProduct.sellerPhone || 'N/A'}</p>
                <p><strong>EasyPaisa Receipt Trx ID:</strong> <span style="background: #1e293b; color: #22c55e; padding: 4px 8px; border-radius: 6px; font-weight: bold;">${newProduct.easypaisaTrxId}</span></p>

                <h3 style="color: #f97316; font-size: 14px; margin-top: 20px;">🖼️ Product Media</h3>
                ${newProduct.images.map(img => `<img src="${img}" style="max-width: 100%; height: auto; border-radius: 12px; margin-bottom: 10px; border: 1px solid #334155;">`).join('')}

                <div style="margin-top: 30px; text-align: center;">
                    <a href="${approvalLink}" style="background-color: #f97316; color: #090d16; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; display: inline-block;">
                        ✅ APPROVE PRODUCT & PUBLISH LIVE
                    </a>
                </div>
            </div>
        `;

        await sendEmail(ADMIN_EMAIL, `[APPROVAL REQ] New Listing: ${newProduct.title}`, adminEmailHTML);
        res.json({ success: true, message: "Product submitted for review.", product: newProduct });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/approve/:id', async (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (product) {
        product.status = 'approved';
        const sellerEmailHTML = `
            <div style="font-family: Arial; background-color: #090d16; color: #ffffff; padding: 20px; border-radius: 12px;">
                <h2 style="color: #22c55e;">🎉 Your Product is Now Live!</h2>
                <p>Your listing <strong>${product.title}</strong> has been approved and published.</p>
            </div>
        `;
        await sendEmail(product.sellerEmail, `Product Approved: ${product.title}`, sellerEmailHTML);
        return res.send(`<h1 style="color: green; text-align: center; margin-top: 50px;">✅ Product Approved Successfully!</h1>`);
    }
    res.status(404).send("Product not found.");
});

app.delete('/api/products/delete/:id', (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.json({ success: true, message: "Product deleted." });
});

// --- ORDERS ---

app.post('/api/orders', async (req, res) => {
    const { items, buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;
    const newOrder = { id: 'ORD-' + Date.now(), items, buyerName, buyerEmail, buyerPhone, buyerAddress, createdAt: new Date().toISOString() };
    orders.push(newOrder);

    for (const item of items) {
        const orderEmailHTML = `
            <div style="font-family: Arial; background-color: #090d16; color: #ffffff; padding: 20px; border-radius: 12px;">
                <h2 style="color: #f97316;">🛍️ New Order Received</h2>
                <p><strong>Product:</strong> ${item.title} (PKR ${item.price})</p>
                <p><strong>Buyer:</strong> ${buyerName} | ${buyerPhone} | ${buyerAddress}</p>
                <p><strong>Vendor Email:</strong> ${item.sellerEmail}</p>
            </div>
        `;
        await sendEmail(ADMIN_EMAIL, `[NEW ORDER] ${item.title}`, orderEmailHTML);
        if (item.sellerEmail) await sendEmail(item.sellerEmail, `[NEW ORDER] ${item.title}`, orderEmailHTML);
    }
    res.json({ success: true, order: newOrder });
});

app.get('/api/orders/user/:email', (req, res) => {
    const userOrders = [];
    orders.forEach(o => {
        if (o.buyerEmail === req.params.email) {
            o.items.forEach(item => userOrders.push({ id: o.id, title: item.title, price: item.price, sellerEmail: item.sellerEmail }));
        }
    });
    res.json(userOrders);
});

// --- MESSAGES / SUPPORT ---

app.get('/api/messages', (req, res) => res.json(messages));

app.post('/api/messages', async (req, res) => {
    const { userEmail, userMessage } = req.body;
    const msg = { id: 'MSG-' + Date.now(), userEmail, userMessage, adminReply: null, createdAt: new Date().toISOString() };
    messages.push(msg);

    await sendEmail(ADMIN_EMAIL, `[SUPPORT MSG] From ${userEmail}`, `<p><strong>${userEmail}:</strong> ${userMessage}</p>`);
    res.json({ success: true, message: msg });
});

app.post('/api/messages/reply', async (req, res) => {
    const { messageId, adminReply } = req.body;
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
        msg.adminReply = adminReply;
        await sendEmail(msg.userEmail, `Support Reply: MT Store`, `<p><strong>Admin Answer:</strong> ${adminReply}</p>`);
        return res.json({ success: true, message: msg });
    }
    res.status(404).json({ error: "Message not found" });
});

// --- USER PROFILE ---

app.post('/api/users/profile', (req, res) => {
    const { email, name, photo, phone } = req.body;
    userProfiles[email] = { name, photo, phone };
    res.json({ success: true, profile: userProfiles[email] });
});

app.get('/api/users/profile/:email', (req, res) => {
    res.json(userProfiles[req.params.email] || {});
});

app.post('/api/users/login', (req, res) => {
    const { email } = req.body;
    res.json({ success: true, user: { email, username: email.split('@')[0] } });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
