const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION ?? 'us-east-1'
});

const app = express();
const port = process.env.PORT ?? 3000;

// Database connection
const dbConfig = {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
    ssl: process.env.DATABASE_SSL === 'true'
};

// API configuration
const apiConfig = {
    key: process.env.API_KEY,
    sendgridKey: process.env.SENDGRID_API_KEY,
    githubToken: process.env.GITHUB_TOKEN
};

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV });
});

app.post('/api/payment', async (req, res) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 2000,
            currency: 'usd'
        });
        res.json(paymentIntent);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Log level: ${process.env.LOG_LEVEL}`);
});

module.exports = app;
