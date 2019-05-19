var Evolver = require('./Evolver.js');

var components = [
    ["2.5b3"],
    ["2.5b3"],
    ["2.5b3"],
    ["bda-2"],
    ["bdp-pi"],
    ["bit15"],
    ["bp-173"],
    ["bax-1"],
    ["bha-1"]
]

var opts = {
    components:components,
    size:1,//large rack
    popSize:10
}

var e = new Evolver(opts);
e.populate();
e.evolve(10000);
e.printGeneration();