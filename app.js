// Name: John Costello
// Project: REST_API
// File description: This file sets up the server and /login route

'use strict';

const path = require('path');
const express = require('express');
const config = require('./config');
const bodyParser = require('body-parser')
const request = require('request');
const helper = require('./helper.js');
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');

const app = express();

app.disable('etag');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('trust proxy', true);
app.use(bodyParser.json());

// Routes 
app.use('/api/users', require('./users/api'));
app.use('/api/players', require('./players/api'));
app.use('/api/teams', require('./teams/api'));

// Helper functions from ./helper.js
var correctHeaders = helper.correctHeaders;

// Set Auth0 info in environment
const AUTH0_URL = process.env.AUTH0_URL;


app.get('/', (req, res) => {
  res.send('Welcome to my 493 final project!');
});

app.post('/api/login', function(req, res, next){
  var status = correctHeaders(req, "POST");
  if (!status) {
    const username = req.body.username;
    const password = req.body.password;
    var options = { method: 'POST',
    url: AUTH0_URL,
    headers: { 'content-type': 'application/json' },
    body:
      { grant_type: 'password',
        username: username,
        password: password,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET},
      json: true };
    request(options, (error, response, body) => {
        if (body.error){
            next({"code": 401, "response": body.error});
        } else {
            res.send(body);
        }
    });
  }
  else {
    next({"code": status})
    return;
  }
});

// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Basic error handler
app.use((err, req, res, next) => {
  /* jshint unused:false */

  // If our routes specified a specific response, then send that. Otherwise,
  // send a generic message so as not to leak anything.

  if (!Number.isInteger(err.code)) {
    err.code = parseInt(err.status);
  }

  if (!err.response) {
    err.response = err.message;
  }

  switch (err.code) {
    case 401: 
      res.status(err.code).send(err.response || "Invalid token");
      break;
    case 403: 
      res.status(err.code).send(err.response || "Non-owner");
      break;
    case 404: 
      res.status(err.code).send(err.response || "Not found");
      break;
    case 405: 
      res.status(err.code).send(err.response || "Invalid request");
      break;
    case 406: 
      res.status(err.code).send(err.response || "Server only provides application/json");
      break;
    default: 
      res.status(err.code).send(err.response || "Something broke");
      break;
  }  
});

if (module === require.main) {
  // Start the server
  const server = app.listen(config.get('PORT'), () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

module.exports = app;