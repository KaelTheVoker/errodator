import express from 'express';
import { Errod, Errodator } from 'errodator';

const app = express();
const port = 3000;

// Configure Errodator
const err = new Errodator(
    // Handler for Errod (custom errors)
    (error, res, metadata = {}) => {
        res.status(metadata.code || 400).json({ error: error.message, details: metadata.details });
        if (metadata.logData) console.log('Log:', metadata.logData);
    },
    // Handler for Error (system errors)
    (error, res, metadata = {}) => {
        res.status(metadata.code || 500).json({ error: 'Something went wrong!' });
        console.error('System error:', error.message);
    },
    // Handler for internal errors
    (error, res, metadata = {}) => {
        res.status(metadata.code || 500).json({ error: 'Internal server error' });
        console.error('Internal error:', error.message);
    }
);

// Example route
app.get('/', (req, res) => {
    try {
        if (Math.random() < 0.5) {
            throw new Errod('Invalid input', { code: 400, details: { field: 'email' }, logData: 'Validation failed' });
        } else {
            throw new Error('System failure');
        }
    } catch (error) {
        err.validate(error, res, { code: error.code || 400, details: error.details });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});