const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const apiRoutes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api', apiRoutes);

app.use((req, res, next) => {
	const error = new Error('Route not found');
	error.status = 404;
	next(error);
});

app.use(errorHandler);

module.exports = app;
