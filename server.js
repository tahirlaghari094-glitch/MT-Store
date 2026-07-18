const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer'); // 🚀 Resend ki jagah Nodemailer import kiya

const app = express();

// Increase payload limits for Base64 assets
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = 'lagharitahir08@gmail.com';
const LIVE_DOMAIN = 'https://mt-store-sandy.vercel.app';

// ==========================================
// 📧 NODEMAILER GMAIL CONFIGURATION
// ==========================================
// Yeh transporter Vercel par save kiye gaye GMAIL_USER aur GMAIL_PASS ko utha kar chalega
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

const sendHtmlEmail = async (to, subject, htmlContent) => {
    if (!to) return;
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER, // Sender aapka apna Gmail account hoga
            to: to,                      // Ab yahan koi bhi random email automatically chalegi!
            subject: subject,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("🚀 Email Sent Successfully via Gmail Nodemailer:", info.messageId);
        return info;
    } catch (error) {
        console.log("❌ Nodemailer Email Sending Failed: ", error);
        throw error;
    }
};

// ==========================================
// 🗄️ MONGODB CONFIGURATION & SCHEMAS
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI;

// Vercel crash na ho agar URI miss ho, isliye initial connect conditional kiya hai
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("🔌 MongoDB Connected Successfully!"))
        .catch(err => console.error("❌ MongoDB Connection Error: ", err));
} else {
    console.error("⚠️ CRITICAL WARNING: MONGODB_URI environment variable is missing!");
}

// Middleware to guarantee database connection check before hit any API
app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1 && MONGODB_URI) {
        mongoose.connect(MONGODB_URI)
            .then(() => next())
            .catch(err => res.status(500).json({ error: "Database reconnection failed" }));
    } else if (!MONGODB_URI) {
        return res.status(500).json({ error: "Database configuration missing on server." });
    } else {
        next();
    }
});

// User Schema
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    username: String,
    profileImage: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Product Schema
const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: String,
    price: Number,
    description: String,
    category: String,
    imageUrl: String,
    videoUrl: String,
    paymentDetails: String,
    address: String,
    contactNumber: String,
    sellerEmail: { type: String, lowercase: true },
    transactionId: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: String, default: () => new Date().toISOString() }
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Order Schema
const OrderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    productId: String,
    title: String,
    price: Number,
    quantity: Number,
    buyerName: String,
    buyerEmail: { type: String, lowercase: true },
    buyerPhone: String,
    buyerAddress: String,
    status: { type: String, default: 'Processing' },
    createdAt: { type: String, default: () => new Date().toISOString() }
});
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// Static Paths Setup
const rootPath = process.cwd();
const publicPath = path.join(rootPath, 'public');

app.use(express.static(rootPath));
app.use(express.static(publicPath));

// ==========================================
// 👤 USER PROFILE & AUTHENTICATION APIS
// ==========================================
app.post('/api/users/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            user = new User({
                email: email.toLowerCase(),
                username: email.split('@')[0],
                profileImage: ''
            });
            await user.save();
        }
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: "Authentication system failure" });
    }
});

app.post('/api/users/update', async (req, res) => {
    const { email, username, profileImage } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ error: "User profile not found" });

        if (username) user.username = username;
        if (profileImage) user.profileImage = profileImage;

        await user.save();
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: "Failed to update profile settings" });
    }
});

// ==========================================
// 🛠️ PRODUCTS & GLOBAL ORDERS PIPELINE
// ==========================================
app.get('/api/products', async (req, res) => {
    try {
        const approvedProducts = await Product.find({ status: 'approved' });
        res.json(approvedProducts);
    } catch (e) {
        res.status(500).json({ error: "Failed to read products" });
    }
});

app.get('/api/products/seller/:email', async (req, res) => {
    try {
        const sellerProducts = await Product.find({ sellerEmail: req.params.email.toLowerCase() });
        res.json(sellerProducts);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch seller products" });
    }
});

app.get('/api/orders/user/:email', async (req, res) => {
    try {
        const userOrders = await Order.find({ buyerEmail: req.params.email.toLowerCase() });
        
        const updatedOrders = [];
        for (let order of userOrders) {
            const prod = await Product.findOne({ id: order.productId });
            updatedOrders.push({
                ...order._doc,
                productImage: prod ? prod.imageUrl : ''
            });
        }
        res.json(updatedOrders);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

app.post('/api/products', async (req, res) => {
    const { title, price, description, category, imageBase64, videoBase64, paymentDetails, address, contactNumber, sellerEmail, transactionId } = req.body;
    if (!title || !price || !imageBase64 || !paymentDetails || !transactionId) {
        return res.status(400).json({ error: "Required details or verification transaction is missing." });
    }

    try {
        const productId = Date.now().toString();

        const newProduct = new Product({
            id: productId,
            title, price: parseFloat(price), description, category: category || 'General',
            imageUrl: imageBase64, videoUrl: videoBase64 || '',
            paymentDetails, address, contactNumber, sellerEmail, transactionId,
            status: 'pending'
        });

        await newProduct.save();

        const approveUrl = `${LIVE_DOMAIN}/api/products/approve/${productId}`;
        
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
        
        await sendHtmlEmail(ADMIN_EMAIL, `🚨 Approve ${title} from ${sellerEmail}`, emailHtml);
        res.status(201).json({ message: "Product listed for admin review." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error or Mail transmission failure." });
    }
});

app.get('/api/products/approve/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.send("<h1>Product not found inside Database!</h1>");

        product.status = 'approved';
        await product.save();

        await sendHtmlEmail(product.sellerEmail, `🚀 Product Live!`, `<h2>Your product "${product.title}" is live now.</h2>`);
        res.send(`<h1 style="text-align:center; margin-top:50px; color:#22c55e; font-family:sans-serif;">✅ Product Approved Successfully!</h1>`);
    } catch (e) {
        res.send("<h1>Server Error processing approval.</h1>");
    }
});

app.post('/api/orders', async (req, res) => {
    const { items, buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;
    if (!items || items.length === 0 || !buyerEmail) return res.status(400).json({ error: "Incomplete order details." });

    try {
        for (const item of items) {
            const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            
            const newOrder = new Order({
                id: orderId, productId: item.id, title: item.title, price: item.price, quantity: item.quantity,
                buyerName, buyerEmail: buyerEmail.toLowerCase(), buyerPhone, buyerAddress,
                status: 'Processing'
            });

            await newOrder.save();

            const linkedProduct = await Product.findOne({ id: item.id });
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

            await sendHtmlEmail(buyerEmail, `🛍️ MT Store Order Confirmation: ${orderId}`, detailedOrderHtml);
            await sendHtmlEmail(ADMIN_EMAIL, `🔔 Platform Notification: Order ${orderId}`, detailedOrderHtml);
            if (sellerTargetEmail) {
                await sendHtmlEmail(sellerTargetEmail, `💼 New Order Received for Your Product: ${orderId}`, detailedOrderHtml);
            }
        }

        res.json({ message: "Order placed successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Order pipeline execution failed." });
    }
});

// SPA Fallback only for non-API routes to avoid intercepting serverless functions
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(rootPath, 'index.html'));
});

// Local Development Server Listener
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 MT Store Engine Active on http://localhost:${PORT}`);
    });
}

// Global Export for Vercel Serverless Architecture
module.exports = app;const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer'); // 🚀 Resend ki jagah Nodemailer import kiya

const app = express();

// Increase payload limits for Base64 assets
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = 'lagharitahir08@gmail.com';
const LIVE_DOMAIN = 'https://mt-store-sandy.vercel.app';

// ==========================================
// 📧 NODEMAILER GMAIL CONFIGURATION
// ==========================================
// Yeh transporter Vercel par save kiye gaye GMAIL_USER aur GMAIL_PASS ko utha kar chalega
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

const sendHtmlEmail = async (to, subject, htmlContent) => {
    if (!to) return;
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER, // Sender aapka apna Gmail account hoga
            to: to,                      // Ab yahan koi bhi random email automatically chalegi!
            subject: subject,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("🚀 Email Sent Successfully via Gmail Nodemailer:", info.messageId);
        return info;
    } catch (error) {
        console.log("❌ Nodemailer Email Sending Failed: ", error);
        throw error;
    }
};

// ==========================================
// 🗄️ MONGODB CONFIGURATION & SCHEMAS
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI;

// Vercel crash na ho agar URI miss ho, isliye initial connect conditional kiya hai
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("🔌 MongoDB Connected Successfully!"))
        .catch(err => console.error("❌ MongoDB Connection Error: ", err));
} else {
    console.error("⚠️ CRITICAL WARNING: MONGODB_URI environment variable is missing!");
}

// Middleware to guarantee database connection check before hit any API
app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1 && MONGODB_URI) {
        mongoose.connect(MONGODB_URI)
            .then(() => next())
            .catch(err => res.status(500).json({ error: "Database reconnection failed" }));
    } else if (!MONGODB_URI) {
        return res.status(500).json({ error: "Database configuration missing on server." });
    } else {
        next();
    }
});

// User Schema
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    username: String,
    profileImage: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Product Schema
const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: String,
    price: Number,
    description: String,
    category: String,
    imageUrl: String,
    videoUrl: String,
    paymentDetails: String,
    address: String,
    contactNumber: String,
    sellerEmail: { type: String, lowercase: true },
    transactionId: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: String, default: () => new Date().toISOString() }
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Order Schema
const OrderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    productId: String,
    title: String,
    price: Number,
    quantity: Number,
    buyerName: String,
    buyerEmail: { type: String, lowercase: true },
    buyerPhone: String,
    buyerAddress: String,
    status: { type: String, default: 'Processing' },
    createdAt: { type: String, default: () => new Date().toISOString() }
});
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// Static Paths Setup
const rootPath = process.cwd();
const publicPath = path.join(rootPath, 'public');

app.use(express.static(rootPath));
app.use(express.static(publicPath));

// ==========================================
// 👤 USER PROFILE & AUTHENTICATION APIS
// ==========================================
app.post('/api/users/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            user = new User({
                email: email.toLowerCase(),
                username: email.split('@')[0],
                profileImage: ''
            });
            await user.save();
        }
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: "Authentication system failure" });
    }
});

app.post('/api/users/update', async (req, res) => {
    const { email, username, profileImage } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ error: "User profile not found" });

        if (username) user.username = username;
        if (profileImage) user.profileImage = profileImage;

        await user.save();
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: "Failed to update profile settings" });
    }
});

// ==========================================
// 🛠️ PRODUCTS & GLOBAL ORDERS PIPELINE
// ==========================================
app.get('/api/products', async (req, res) => {
    try {
        const approvedProducts = await Product.find({ status: 'approved' });
        res.json(approvedProducts);
    } catch (e) {
        res.status(500).json({ error: "Failed to read products" });
    }
});

app.get('/api/products/seller/:email', async (req, res) => {
    try {
        const sellerProducts = await Product.find({ sellerEmail: req.params.email.toLowerCase() });
        res.json(sellerProducts);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch seller products" });
    }
});

app.get('/api/orders/user/:email', async (req, res) => {
    try {
        const userOrders = await Order.find({ buyerEmail: req.params.email.toLowerCase() });
        
        const updatedOrders = [];
        for (let order of userOrders) {
            const prod = await Product.findOne({ id: order.productId });
            updatedOrders.push({
                ...order._doc,
                productImage: prod ? prod.imageUrl : ''
            });
        }
        res.json(updatedOrders);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

app.post('/api/products', async (req, res) => {
    const { title, price, description, category, imageBase64, videoBase64, paymentDetails, address, contactNumber, sellerEmail, transactionId } = req.body;
    if (!title || !price || !imageBase64 || !paymentDetails || !transactionId) {
        return res.status(400).json({ error: "Required details or verification transaction is missing." });
    }

    try {
        const productId = Date.now().toString();

        const newProduct = new Product({
            id: productId,
            title, price: parseFloat(price), description, category: category || 'General',
            imageUrl: imageBase64, videoUrl: videoBase64 || '',
            paymentDetails, address, contactNumber, sellerEmail, transactionId,
            status: 'pending'
        });

        await newProduct.save();

        const approveUrl = `${LIVE_DOMAIN}/api/products/approve/${productId}`;
        
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
        
        await sendHtmlEmail(ADMIN_EMAIL, `🚨 Approve ${title} from ${sellerEmail}`, emailHtml);
        res.status(201).json({ message: "Product listed for admin review." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error or Mail transmission failure." });
    }
});

app.get('/api/products/approve/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.send("<h1>Product not found inside Database!</h1>");

        product.status = 'approved';
        await product.save();

        await sendHtmlEmail(product.sellerEmail, `🚀 Product Live!`, `<h2>Your product "${product.title}" is live now.</h2>`);
        res.send(`<h1 style="text-align:center; margin-top:50px; color:#22c55e; font-family:sans-serif;">✅ Product Approved Successfully!</h1>`);
    } catch (e) {
        res.send("<h1>Server Error processing approval.</h1>");
    }
});

app.post('/api/orders', async (req, res) => {
    const { items, buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;
    if (!items || items.length === 0 || !buyerEmail) return res.status(400).json({ error: "Incomplete order details." });

    try {
        for (const item of items) {
            const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            
            const newOrder = new Order({
                id: orderId, productId: item.id, title: item.title, price: item.price, quantity: item.quantity,
                buyerName, buyerEmail: buyerEmail.toLowerCase(), buyerPhone, buyerAddress,
                status: 'Processing'
            });

            await newOrder.save();

            const linkedProduct = await Product.findOne({ id: item.id });
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

            await sendHtmlEmail(buyerEmail, `🛍️ MT Store Order Confirmation: ${orderId}`, detailedOrderHtml);
            await sendHtmlEmail(ADMIN_EMAIL, `🔔 Platform Notification: Order ${orderId}`, detailedOrderHtml);
            if (sellerTargetEmail) {
                await sendHtmlEmail(sellerTargetEmail, `💼 New Order Received for Your Product: ${orderId}`, detailedOrderHtml);
            }
        }

        res.json({ message: "Order placed successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Order pipeline execution failed." });
    }
});

// SPA Fallback only for non-API routes to avoid intercepting serverless functions
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(rootPath, 'index.html'));
});

// Local Development Server Listener
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 MT Store Engine Active on http://localhost:${PORT}`);
    });
}

// Global Export for Vercel Serverless Architecture
module.exports = app;
