var Evolver = require('./Evolver.js');

var components = [
    ["2.5b3"],
    ["bda-2"],
    ["bdp-pi"],
    ["bit15"],
    ["bp-173"],
    ["bha-1"]
]

var opts = {
    components:components,
    size:0,//small
    popSize:10
}

var e = new Evolver(opts);
e.populate();
e.evolve(10000);
e.printGeneration();