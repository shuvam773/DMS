const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk').default; // Fixed chalk import
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Enhanced logger with proper chalk initialization
const logger = {
  info: (message, meta = {}) => {
    console.log(chalk.blue(`[INFO] ${message}`), meta);
  },
  success: (message, meta = {}) => {
    console.log(chalk.green(`[SUCCESS] ${message}`), meta);
  },
  error: (message, meta = {}) => {
    console.error(chalk.red.bold(`[ERROR] ${message}`), meta);
  },
  request: (req) => {
    console.log(
      chalk.yellow(`[${new Date().toISOString()}]`),
      chalk.cyan.bold(req.method),
      req.path,
      chalk.gray(`from ${getIp(req)}`)
    );
  },
  response: (req, res, duration) => {
    const statusColor = res.statusCode >= 400 ? chalk.red : chalk.green;
    console.log(
      chalk.yellow(`[${new Date().toISOString()}]`),
      statusColor.bold(`Status: ${res.statusCode}`),
      chalk.gray(`in ${duration}ms`)
    );
  }
};

const getIp = (req) => {
  let ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip && ip.includes('::ffff:')) ip = ip.split(':').pop();
  return ip || 'unknown';
};

const redactSensitiveFields = (obj) => {
  if (!obj) return obj;
  const sensitiveFields = ['password', 'token', 'jwtToken', 'authorization'];
  const clone = JSON.parse(JSON.stringify(obj));
  
  sensitiveFields.forEach(field => {
    if (clone[field]) clone[field] = '***REDACTED***';
  });
  return clone;
};

const logRequest = (req, res, next) => {
  const requestId = uuidv4();
  req._requestId = requestId;
  req._startTime = process.hrtime();

  logger.request(req);
  
  const logEntry = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: getIp(req),
    user: req.user?.id || 'anonymous',
    query: req.query,
    params: req.params,
    body: redactSensitiveFields(req.body)
  };

  fs.appendFileSync(
    path.join(logsDir, 'requests.log'),
    JSON.stringify(logEntry) + '\n'
  );

  next();
};

const logResponse = (req, res, next) => {
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks = [];

  res.write = function (chunk) {
    chunks.push(chunk);
    return oldWrite.apply(res, arguments);
  };

  res.end = function (chunk) {
    if (chunk) chunks.push(chunk);
    
    const durationMs = (process.hrtime(req._startTime)[0] * 1e3 + 
                       process.hrtime(req._startTime)[1] / 1e6).toFixed(2);

    logger.response(req, res, durationMs);

    const responseLog = {
      requestId: req._requestId,
      timestamp: new Date().toISOString(),
      status: res.statusCode,
      duration: `${durationMs}ms`,
      body: chunks.length ? Buffer.concat(chunks).toString('utf8') : null
    };

    fs.appendFileSync(
      path.join(logsDir, 'responses.log'),
      JSON.stringify(responseLog) + '\n'
    );

    oldEnd.apply(res, arguments);
  };

  next();
};

const errorLogger = (err, req, res, next) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    requestId: req._requestId,
    path: req.path,
    method: req.method,
    user: req.user?.id,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  };

  logger.error(`Error in ${req.method} ${req.path}`, {
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });

  fs.appendFileSync(
    path.join(logsDir, 'errors.log'),
    JSON.stringify(errorLog) + '\n'
  );

  next(err);
};

module.exports = { logRequest, logResponse, errorLogger };