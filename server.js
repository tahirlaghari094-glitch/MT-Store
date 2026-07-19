const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "mt_secure_core_token_hash_engine_2026";

app.use(express.json());

// Serving static assets manually inside serverless execution if needed
app.use(express.static(path.join(__dirname, '/')));

// Secure Email SMTP Channel Configuration
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'lagharitahir08@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password-here'
    }
});

// Runtime Array simulating real database
let realProductsDatabase = [
    { id: "p1", name: "GMT Watch (Qty: 1)", price: 500, storeRef: "Admin Managed" },
    { id: "p2", name: "Tissot Chronograph Special", price: 2500, storeRef: "Admin Managed" }
];

// Authorization Middleware
function verifyUserToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (!bearerHeader) return res.status(401).json({ message: "Access keys unauthorized." });

    const token = bearerHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decodedData) => {
        if (err) return res.status(403).json({ message: "Invalid session authority parameters." });
        req.userData = decodedData;
        next();
    });
}

// Secure Login Route
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email === "lagharitahir08@gmail.com" && password === "123456") {
        const userToken = jwt.sign({ email: email, name: "Muhammad Tahir" }, JWT_SECRET, { expiresIn: '365d' });
        return res.status(200).json({ success: true, token: userToken });
    }
    return res.status(400).json({ success: false, message: "Invalid email or credentials parameters context." });
});

// GET ROUTE: Fetch real products
app.get('/api/products/uploaded', verifyUserToken, (req, res) => {
    res.status(200).json(realProductsDatabase);
});

// POST ROUTE: Upload new product
app.post('/api/products/upload', verifyUserToken, (req, res) => {
    const { name, price } = req.body;
    if (!name || !price) return res.status(400).json({ message: "Invalid input variables." });

    const generatedProductItem = {
        id: "prod_" + Date.now(),
        name: `${name} (Qty: 1)`,
        price: parseInt(price),
        storeRef: "Vendor Uploaded"
    };

    realProductsDatabase.unshift(generatedProductItem);
    res.status(200).json({ success: true, item: generatedProductItem });
});

// DELETE ROUTE: Product delete aur dono ko email notification (Admin + Seller)
app.delete('/api/products/delete/:id', verifyUserToken, (req, res) => {
    const elementId = req.params.id;
    const itemReference = realProductsDatabase.find(p => p.id === elementId);

    if (!itemReference) {
        return res.status(404).json({ success: false, message: "Asset object item not located inside database cache." });
    }

    realProductsDatabase = realProductsDatabase.filter(p => p.id !== elementId);

    const adminEmail = process.env.EMAIL_USER || 'lagharitahir08@gmail.com'; 
    const sellerEmail = req.userData.email; 

    const optionsPayload = {
        from: adminEmail,
        to: `${adminEmail}, ${sellerEmail}`,
        subject: `Cancellation Engine Notification - Item dropped: ${itemReference.name}`,
        text: `Hello,\n\nThis system transmission serves to verify that the following data listing asset has been dropped and completely cancelled:\n\nProduct Title: ${itemReference.name}\nPrice Index: PKR ${itemReference.price}\n\nOperation completed from database records engine safely.\n\nBest Regards,\nMT Store System Control Core.`
    };

    emailTransporter.sendMail(optionsPayload, (err, completionInfo) => {
        if (err) {
            console.error("Nodemailer routing failure report log details: ", err);
            return res.status(200).json({ success: true, message: "Item dropped, but mail notifications dropped out.", error: err.message });
        }
        console.log("Mail transaction executed successfully: " + completionInfo.response);
        return res.status(200).json({ success: true, message: "Product record removed and cancellation dispatch notification email fired successfully to Admin and Seller." });
    });
});

// Fallback HTML router entry point compatible with Vercel paths
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Vercel serverless export setup
module.exports = app;
