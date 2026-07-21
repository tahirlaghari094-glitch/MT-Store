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
        await transporter.sendMail(mailOptions);
        console.log("🚀 Email routed successfully to:", to);
    } catch (error) {
        console.log("❌ Email configuration error: ", error);
    }
};

const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("🔌 MongoDB Connected Successfully!"))
        .catch(err => console.error("❌ MongoDB Engine Error: ", err));
}

// SCHEMAS DEFINITION
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    username: String,
    profileImage: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const CommentSchema = new mongoose.Schema({
    author: String,
    text: String,
    rating: { type: Number, default: 0 },
    media: [{ type: { type: String }, url: String }],
    isPinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: String,
    price: Number,
    description: String,
    category: String,
    imageUrl: String,
    images: [String],
    videoUrl: String, // Field to store product video
    comments: [CommentSchema],
    sellerEmail: { type: String, lowercase: true },
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
    buyerEmail: { type: String, lowercase: true },
    buyerName: String,
    buyerPhone: String,
    buyerAddress: String,
    status: { type: String, default: 'Processing' },
    createdAt: { type: String, default: () => new Date().toISOString() }
});
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// STATIC FILES ROUTER MIDDLEWARE
const rootPath = process.cwd();
app.use(express.static(rootPath));
app.use(express.static(path.join(rootPath, 'public')));

// API ENDPOINTS
app.post('/api/users/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    try {
        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            user = new User({ email: email.toLowerCase(), username: email.split('@')[0] });
            await user.save();
        }
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ error: "Error" }); }
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

app.delete('/api/products/delete/:id', async (req, res) => {
    try {
        await Product.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/products/:id/comments', async (req, res) => {
    const { author, text, rating, media, isPinned } = req.body;
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.status(404).json({ error: "Product not found" });

        product.comments.push({ 
            author, 
            text, 
            rating: rating || 0,
            media: media || [],
            isPinned: !!isPinned 
        });
        await product.save();
        res.json({ success: true, comments: product.comments });
    } catch (e) { res.status(500).json({ error: "Error posting comment" }); }
});

app.get('/api/orders/user/:email', async (req, res) => {
    try {
        const userOrders = await Order.find({ buyerEmail: req.params.email.toLowerCase() });
        const records = [];
        for (let o of userOrders) {
            const p = await Product.findOne({ id: o.productId });
            records.push({ ...o._doc, sellerEmail: p ? p.sellerEmail : '' });
        }
        res.json(records);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/products', async (req, res) => {
    const { title, price, description, category, images, imageUrl, videoUrl, sellerEmail } = req.body;
    try {
        const productId = Date.now().toString();
        const imgList = (images && images.length > 0) ? images : [imageUrl];
        
        const newProduct = new Product({ 
            id: productId, 
            title, 
            price: parseFloat(price), 
            description, 
            category, 
            imageUrl: imgList[0],
            images: imgList, 
            videoUrl: videoUrl || null,
            sellerEmail 
        });
        await newProduct.save();

        const approveUrl = `${LIVE_DOMAIN}/api/products/approve/${productId}`;
        const emailHtml = `<h2>Product Review Pipeline Pending</h2><p>Vendor: ${sellerEmail}</p><a href="${approveUrl}">Click to Live Verify Item</a>`;
        await sendHtmlEmail(ADMIN_EMAIL, `Approve ${title}`, emailHtml);

        res.status(201).json({ message: "Dispatched pipeline." });
    } catch (error) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/products/approve/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.send("Not Found");
        product.status = 'approved';
        await product.save();
        await sendHtmlEmail(product.sellerEmail, `🚀 Item Live Alert!`, `<h2>Your product "${product.title}" is now approved.</h2>`);
        res.send("<h1>Approved Live!</h1>");
    } catch (e) { res.send("Error"); }
});

app.post('/api/orders/cancel', async (req, res) => {
    const { orderId, productTitle, sellerEmail, cancelledBy } = req.body;
    try {
        await Order.deleteOne({ id: orderId });
        
        const cancellationHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #070a13; color: #f3f4f6; border-radius: 12px; border: 1px solid #ef4444;">
                <h3 style="color: #ef4444;">❌ Order Cancellation Notice</h3>
                <p><strong>Order ID Instance:</strong> ${orderId}</p>
                <p><strong>Product Target:</strong> ${productTitle}</p>
                <p><strong>Cancelled Processing Request By:</strong> ${cancelledBy}</p>
            </div>
        `;

        await sendHtmlEmail(ADMIN_EMAIL, `Order Cancelled: ${orderId}`, cancellationHtml);
        
        if (sellerEmail && sellerEmail.trim() !== '') {
            await sendHtmlEmail(sellerEmail.trim(), `Cancellation Notice: Order ${orderId}`, cancellationHtml);
        }

        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Pipeline failure" }); }
});

app.post('/api/orders', async (req, res) => {
    const { items, buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;
    try {
        for (const item of items) {
            const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            const newOrder = new Order({ id: orderId, productId: item.id, title: item.title, price: item.price, quantity: item.quantity, buyerEmail, buyerName, buyerPhone, buyerAddress });
            await newOrder.save();

            const orderHtml = `<h2>New Order Created: ${orderId}</h2><p>Title: ${item.title}</p>`;
            await sendHtmlEmail(buyerEmail, `Order Placed`, orderHtml);
            await sendHtmlEmail(ADMIN_EMAIL, `New Platform Order Request`, orderHtml);
        }
        res.json({ message: "Dispatched order pipelines." });
    } catch (error) { res.status(500).json({ error: "Error" }); }
});

app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(path.join(rootPath, 'index.html')); });

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server executing safely on port ${PORT}`));
}
module.exports = app;
