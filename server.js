const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = 'lagharitahir08@gmail.com';
const LIVE_DOMAIN = 'https://mt-store-sandy.vercel.app';

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
            from: process.env.GMAIL_USER,
            to: to.toLowerCase(),
            subject: subject,
            html: htmlContent
        };
        const info = await transporter.sendMail(mailOptions);
        console.log("🚀 Email Sent Successfully:", info.messageId);
        return info;
    } catch (error) {
        console.log("❌ Email Sending Failed: ", error);
    }
};

const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("🔌 MongoDB Connected!"))
        .catch(err => console.error("❌ MongoDB Error: ", err));
}

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    username: String,
    profileImage: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: String,
    price: Number,
    description: String,
    category: String,
    imageUrl: String,
    imageUrls: [String],
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

const ReviewSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    comment: String,
    rating: String,
    username: String,
    date: { type: String, default: () => new Date().toLocaleDateString() },
    createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

// Static Server Config
const rootPath = process.cwd();
app.use(express.static(rootPath));
app.use(express.static(path.join(rootPath, 'public')));

// APIS
app.post('/api/users/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    try {
        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            user = new User({ email: email.toLowerCase(), username: email.split('@')[0], profileImage: '' });
            await user.save();
        }
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/users/update', async (req, res) => {
    const { email, username, profileImage } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ error: "User not found" });
        if (username) user.username = username;
        if (profileImage) user.profileImage = profileImage;
        await user.save();
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ error: "Update failed" }); }
});

app.get('/api/products/:productId/reviews', async (req, res) => {
    try {
        const productReviews = await Review.find({ productId: req.params.productId }).sort({ createdAt: -1 });
        res.json(productReviews);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/products/:productId/reviews', async (req, res) => {
    const { comment, rating, username } = req.body;
    if (!comment) return res.status(400).json({ error: "Review empty" });
    try {
        const newReview = new Review({ productId: req.params.productId, comment, rating: rating || "5", username: username || "Anonymous" });
        await newReview.save();
        res.status(201).json({ success: true, review: newReview });
    } catch (error) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/products', async (req, res) => {
    try {
        const approvedProducts = await Product.find({ status: 'approved' });
        res.json(approvedProducts);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/products/seller/:email', async (req, res) => {
    try {
        const sellerProducts = await Product.find({ sellerEmail: req.params.email.toLowerCase() });
        res.json(sellerProducts);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 🛠️ DELETE UPLOADED PRODUCT ENDPOINT
app.delete('/api/products/delete/:id', async (req, res) => {
    try {
        await Product.deleteOne({ id: req.params.id });
        res.json({ success: true, message: "Item deleted securely from Database." });
    } catch (e) {
        res.status(500).json({ error: "Failed to delete item from database pipeline." });
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
                productImage: prod ? prod.imageUrl : '',
                sellerEmail: prod ? prod.sellerEmail : ''
            });
        }
        res.json(updatedOrders);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/products', async (req, res) => {
    const { title, price, description, category, imageBase64, imageUrls, videoBase64, paymentDetails, address, contactNumber, sellerEmail, transactionId } = req.body;
    try {
        const productId = Date.now().toString();
        const newProduct = new Product({
            id: productId, title, price: parseFloat(price), description, category,
            imageUrl: imageBase64 || (imageUrls && imageUrls[0]), imageUrls: imageUrls || [imageBase64],
            videoUrl: videoBase64 || '', paymentDetails, address, contactNumber, sellerEmail, transactionId
        });
        await newProduct.save();
        const approveUrl = `${LIVE_DOMAIN}/api/products/approve/${productId}`;
        const emailHtml = `<h2>New Store Submission Pending</h2><p>Seller: ${sellerEmail}</p><p>Item: ${title}</p><a href="${approveUrl}">Verify Live Now</a>`;
        await sendHtmlEmail(ADMIN_EMAIL, `🚨 Approve ${title}`, emailHtml);
        res.status(201).json({ message: "Listed for review." });
    } catch (error) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/products/approve/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.send("Not Found");
        product.status = 'approved';
        await product.save();
        await sendHtmlEmail(product.sellerEmail, `🚀 Product Live!`, `<h2>Your item "${product.title}" is live.</h2>`);
        res.send("<h1>✅ Product Approved!</h1>");
    } catch (e) { res.send("Error"); }
});

// 🚀 FIXED: Dynamic cancellation pipeline triggering alerts to BOTH Admin & Seller
app.post('/api/orders/cancel', async (req, res) => {
    const { orderId, productTitle, sellerEmail, cancelledBy } = req.body;
    try {
        await Order.deleteOne({ id: orderId });
        const cancelEmailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0b0f19; color: #f3f4f6; border-radius: 12px;">
                <h2 style="color: #ef4444;">❌ Order Cancelled Alert</h2>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Product Name:</strong> ${productTitle}</p>
                <p><strong>Action Executed By:</strong> ${cancelledBy}</p>
            </div>
        `;
        // Send alert email to Admin
        await sendHtmlEmail(ADMIN_EMAIL, `❌ Order Cancelled: ${orderId}`, cancelEmailHtml);
        
        // Send alert email to Seller (Fixed destination delivery logic)
        if (sellerEmail && sellerEmail.trim() !== '') {
            await sendHtmlEmail(sellerEmail.trim(), `❌ Order Cancelled: ${orderId}`, cancelEmailHtml);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed" });
    }
});

app.post('/api/orders', async (req, res) => {
    const { items, buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;
    try {
        for (const item of items) {
            const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            const linkedProduct = await Product.findOne({ id: item.id });
            const sellerTargetEmail = linkedProduct ? linkedProduct.sellerEmail : null;

            const newOrder = new Order({ id: orderId, productId: item.id, title: item.title, price: item.price, quantity: item.quantity, buyerName, buyerEmail, buyerPhone, buyerAddress });
            await newOrder.save();

            const orderHtml = `<h2>Order Report: ${orderId}</h2><p>Item: ${item.title}</p><p>Buyer: ${buyerName}</p>`;
            await sendHtmlEmail(buyerEmail, `🛍️ Order Placed: ${orderId}`, orderHtml);
            await sendHtmlEmail(ADMIN_EMAIL, `🔔 Platform Order: ${orderId}`, orderHtml);
            if (sellerTargetEmail) {
                await sendHtmlEmail(sellerTargetEmail, `💼 New Order for your Product: ${orderId}`, orderHtml);
            }
        }
        res.json({ message: "Success" });
    } catch (error) { res.status(500).json({ error: "Error" }); }
});

app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(path.join(rootPath, 'index.html')); });
if (process.env.NODE_ENV !== 'production') { app.listen(PORT); }
module.exports = app;
