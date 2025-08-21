const winston = require('winston');
const path = require('path');

// Generate a unique identifier for each run
const uniqueId = new Date().toISOString().replace(/[:.]/g, '-');

// Ensure logs directory exists
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, '../logs'))) {
    fs.mkdirSync(path.join(__dirname, '../logs'));
}

// Configure logger
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'MM-DD HH:mm:ss' }),
      winston.format.splat(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level}]: ${message}`;
      })
    ),
    transports: [
      // Write to console
      new winston.transports.Console(),
      // Write to a unique log file for each run
      new winston.transports.File({ 
        filename: path.join(__dirname, '../logs', `detector-${uniqueId}.log`),
        // maxsize: 5242880, // 5MB
        maxsize: 1024*5*5,
        maxFiles: 500,
        tailable: true,
        format: winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      }),

      // Error report
      new winston.transports.File({
        level: 'error', // only log error and more severe
        filename: path.join(__dirname, '../logs/errors', `error-${uniqueId}.log`),
        format: winston.format.combine(
          winston.format.timestamp({ format: 'MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
          })
        )
      })
    ]
  });
  
module.exports = logger;