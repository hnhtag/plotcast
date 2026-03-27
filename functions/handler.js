const { handle } = require('hono/aws-lambda');
const app = require('./app');

module.exports.handler = handle(app);
