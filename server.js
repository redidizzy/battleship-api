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
app.post('/create-game', (req, res, next) => {
    let size = req.body.size
    sqrSize = size * size
    let playerShips = req.body.playerShips
    let opponentShips = []
    for (let i = 0; i < 3; i++) {
        let randomNumber
        let x
        let y
        do {
            randomNumber = Math.floor(Math.random() * sqrSize + 1)
            x = randomNumber % size + 1
            y = Math.floor(randomNumber / size + 1)
        } while (x == 8 || opponentShips.find(ship => ship.coordinates[1] == y && (ship.coordinates[0] == x + 1 || ship.coordinates[0] == x)) || playerShips.find(ship => ship.coordinates[1] == y && (ship.coordinates[0] == x + 1 || ship.coordinates[0] == x)))
        opponentShips.push({
            alignment: 'horizontal',
            coordinates: [x, y],
        })
        opponentShips.push({
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
            opponentShips,
            playerShips,
            opponentAttacks: [],
            playerAttacks: [],
            size
        })
        client.set('games', JSON.stringify(games))
        res.json({ identifier });
        return next()
    })

});
app.post('/attack', (req, res, next) => {
    client.get('games', (err, rep) => {
        if (err) {
            res.status(500).json({ err });
            return;
        }
        let games
        if (rep) {
            games = JSON.parse(rep)
            const data = req.body
            const gameIndex = games.findIndex(g => g.identifier == data.identifier)
            const game = games[gameIndex]
            if (!game) {
                res.status(404).json({ err: `No game with identifier ${data.identifier} has been found !` });
            }
            const hasPlayerAttacked = game.playerAttacks.find(attack => attack.coordinates[0] == data.coordinates[0] && attack.coordinates[1] == data.coordinates[1])
            if (hasPlayerAttacked) {
                res.status(400).json({ err: `You have already attacked in these coordinates` });
            }
            let playerAttack = { coordinates: data.coordinates }
            game.playerAttacks.push(playerAttack)
            if (game.opponentShips.find(ship => playerAttack.coordinates[0] == ship.coordinates[0] && playerAttack.coordinates[1] == ship.coordinates[1])) {
                playerAttack.hasTouchedOpponentShip = true
            } else {
                playerAttack.hasTouchedOpponentShip = false
            }

            // Verify if all the opponent's ships have been attacked, if so, finish the game
            const hasPlayerWon = game.opponentShips.every(ship => game.playerAttacks.find(attack => attack.coordinates[0] == ship.coordinates[0] && attack.coordinates[1] == ship.coordinates[1]))
            if (hasPlayerWon) {
                const response = {
                    hasPlayerWon,
                    playerAttack
                }
                games[gameIndex] = game
                client.set('games', JSON.stringify(games))
                res.json(response)
                return next()
            }

            // Generate opponent's attack
            let randomNumber
            let x
            let y
            let sqrSize = game.size * game.size
            do {
                randomNumber = Math.floor(Math.random() * sqrSize + 1)
                x = randomNumber % game.size + 1
                y = Math.floor(randomNumber / game.size + 1)
            } while (game.opponentAttacks.find(attack => attack.coordinates[0] == x && attack.coordinates[1] == y))


            let opponentAttack = { coordinates: [x, y] }
            game.opponentAttacks.push(opponentAttack)
                // Verify if opponent has attacked all player's ships
            const hasOpponentWon = game.playerShips.every(ship => game.opponentAttacks.find(attack => attack.coordinates[0] == ship.coordinates[0] && attack.coordinates[1] == ship.coordinates[1]))

            games[gameIndex] = game
            client.set('games', JSON.stringify(games))
            const response = {
                opponentAttack,
                playerAttack,
                hasOpponentWon,
            }
            res.json(response)
            return next()

        } else {
            res.status(404).json({ err: 'No game has been created yet !' });
            return next()
        }

    })
})

const port = process.env.PORT || 3001
    // listen for requests
app.listen(port, () => {
    console.log("Server is listening on port " + port);
});