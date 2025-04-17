const axios = require('axios');
const express = require('express');
const multer = require('multer');
const winston = require('winston');
const expressWinston = require('express-winston');

const env = require('./env');

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ],
});

const app = express();
app.use(express.json());
app.use(expressWinston.logger({
  level: env.LOG_LEVEL,
  statusLevels: {
    "success": "debug",
    "warn": "warn",
    "error": "error"
  },
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  ignoreRoute: function (req, res) {
    let ignoreHealth = req.path == env.HEALTH_PATH && !env.LOG_HEALTH_REQUESTS

    return ignoreHealth;
  }
}));

const upload = multer({
  fileFilter: function (_, _, cb) {
    // Don't care about the thumb in Plex's multipart requests
    cb(null, false);
  }
});

const postUrl = env.POST_URL || `http://localhost:<span class="math-inline">\{env\.LISTEN\_PORT\}</span>{env.SELF_TEST_PATH}`;

// Get allowed client IDs from environment variable
const ALLOWED_CLIENT_IDS = (process.env.ALLOWED_CLIENT_IDS || "").split(",").filter(Boolean);  //  Ensure no empty strings

app.post(env.LISTEN_PATH, upload.single('thumb'), (req, res, _) => {
  try {
    //  Access the payload from req.body.payload (multer parses the form data)
    var content = req.body.payload;
    var payload = JSON.parse(content);

    logger.debug('Received payload:', payload);

  } catch (err) {
    let msg = `Error parsing payload '${content}': ${err}`;
    logger.error(msg);
    return res.status(400).send(msg);
  }

  if (payload) {
    const clientIdentifier = payload.Player.uuid;
    if (ALLOWED_CLIENT_IDS.length > 0 && !ALLOWED_CLIENT_IDS.includes(clientIdentifier)) {
      logger.warn(`Request from client '${clientIdentifier}' is not allowed.`);
      return res.status(403).send('Unauthorized client');
    }

    logger.debug(`Forwarding request`, { params: req.query, payload: payload });
    axios.post(postUrl, payload, { params: req.query })
      .then((forwardRes) => {
        logger.debug(`HTTP POST ${postUrl} ${forwardRes.status} ${forwardRes.statusText}`, forwardRes.data);
        res.status(forwardRes.status).send(forwardRes.data);
      }).catch((err) => {
        logger.error(err);
        res.status(500).send(err);
      });
  }
});

app.post(env.SELF_TEST_PATH, (req, res) => {
  let dataReceived = {headers: req.headers, queryString: req.query, data: req.body}
  logger.debug('[SELF-TEST] Received request', dataReceived);
  res.send({selfTest: 'OK', dataReceived: dataReceived});
});

//  Simple health check endpoint for all of your probing needs
app.get(env.HEALTH_PATH, (_, res) => {
  res.send('OK');
});

app.listen(env.LISTEN_PORT, () => {
  logger.info(`Server listening on port ${env.LISTEN_PORT}`);
  if (!env.POST_URL) logger.warn('POST_URL not defined - using self-test endpoint');
  logger.info(`Proxying requests to ${postUrl}`);
  logger.info('Ready to receive requests')
});

//  Trap CTRL-C - node doesn't exit in docker...
process.on('SIGINT', function (code) {
  logger.info('Stopping server');
  process.exit();
});
