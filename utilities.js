var MersenneTwister = require('mersenne-twister');
var generator = new MersenneTwister();

var Utilities = module.exports = {};

Utilities.getRandomInt = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(generator.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

//0 = error, 1 = warning, 2 = verbose
Utilities.logLevel = 0;

Utilities.log = function(level, msg){
    if(Utilities.logLevel >= level){
        console.log(msg);
    }
}
Utilities.logz = function(level, msg){
    if(Utilities.loglLevel >= level){
        console.log(msg);
    }
}

Utilities.components = require('./components.json');