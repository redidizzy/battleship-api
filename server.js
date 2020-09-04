const express = require('express');
const bodyParser = require('body-parser');

let cors = require('cors')

// create express app
const app = express();

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse requests of content-type - application/json
app.use(bodyParser.json())


//production redis url
let redis_url = process.env.REDIS_URL;
if (process.env.ENVIRONMENT === 'development') {
    require('dotenv').config();
    redis_url = "redis://127.0.0.1";
}
var redis = require("redis");
let Redis = require('ioredis');
var client = redis.createClient();


client.on("connect", function() {
    console.log("You are now connected on redis");
});

// define a simple route
app.post('/create-game', (req, res) => {
    let size = req.body.size
    size *= size
    let enemyShips = []
    for (let i = 0; i < 3; i++) {
        let randomNumber
        do {
            randomNumber = Math.floor(Math.random() * size + 1)
        } while (enemyShips.find(ship => ship.position == randomNumber || ship.position == randomNumber + 1) || randomNumber % size + 1 === 8)
        let x = randomNumber % size + 1
        let y = randomNumber / size + 1
        enemyShips.push({
            alignment: 'horizontal',
            coordinates: [x, y],
        })
        enemyShips.push({
            alignment: 'horizontal',
            coordinates: [x + 1, y],
        })
    }
   
    res.json({ });

});

// listen for requests
app.listen(3001, () => {
    console.log("Server is listening on port 3001");
});