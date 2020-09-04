const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

let cors = require('cors')

// create express app
const app = express();

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse requests of content-type - application/json
app.use(bodyParser.json())

app.use(cors())

//production redis url
let redis_url = process.env.REDIS_URL;
if (process.env.ENVIRONMENT === 'development') {
    redis_url = "redis://127.0.0.1";
}
var redis = require("redis");
var client = redis.createClient();


client.on("connect", function() {
    console.log("You are now connected on redis");
});

// API Endpoints
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
    client.get('games', (err, rep) => {
        if (err) {
            res.status(500).json({ err });
            return;
        }
        let games = []
        if (rep) {
            games = JSON.parse(rep)
        }
        let identifier
        do {
            identifier = 'game-' + Math.floor(Math.random() * 99999999)
        } while (games && games.find(game => game.identifier == identifier))
        
        let playerShips = req.body.playerShips
        games.push({
            identifier,
            enemyShips,
            playerShips
        })
        client.set('games', JSON.stringify(games))
        res.json({ identifier });

    })
    
});

const port = process.env.PORT || 3001
// listen for requests
app.listen(port, () => {
    console.log("Server is listening on port "+port);
});