var Rack = require('./Rack.js');
var Utilities = require('./shared/utilities.js');
var RW = require("roulette-wheel");

Utilities.logLevel = 1;

class Evolver {
    constructor(opts) {
        this.size = 0;
        if (Number.isInteger(opts.size)){
            this.size = opts.size; // or 1 for large;
        }

        this.popSize = 10;
        if (Number.isInteger(opts.popSize)){
            this.popSize = opts.popSize; // or 1 for large;
        }

        this.rackConfig = {
            size: this.size, //rack size
            bottomShelfRequired: true, //TODO false
            topShelfRequired: true //TODO false
        }

        this.components;
        if(opts.components){
            this.components = opts.components;
        }else{
            throw new TypeError('{components} cannot be empty')
        }

        this.genNum = 0;
        this.generation = [];
        this.currentGeneration = 0;
        this.nextGeneration = 1;
    }

    normalizeFitness(genNum) {
        var bestFit = 999999;
        var bestFitIndex = -1;
        var maxVal = 0;
    
        for (var i = 0; i < this.generation[genNum].length; i++) {
            var fit = this.generation[genNum][i].fitness();
            if (fit < bestFit) {
                bestFitIndex = i;
                bestFit = fit;
            }
            if (fit > maxVal)
                maxVal = fit;
        }
    
        var ret = [];
        for (var i = 0; i < this.generation[genNum].length; i++) {
            ret.push((1 - (this.generation[genNum][i].fitness() / maxVal)));
    
        }
        return ({
            ret: ret,
            bestFitIndex: bestFitIndex
        });
    
    }
    //print the best of a generation
    printGeneration(genNum=this.currentGeneration) {
        var fits = this.normalizeFitness(genNum);
        this.generation[genNum][fits.bestFitIndex].print();
    }

    makeNewGeneration(genNum) {
        this.generation[genNum] = [];
        var normalized = this.normalizeFitness(genNum - 1);
        var fits = normalized.ret;
    
        //element 0 is a clone of best. 
        this.generation[genNum][0] = this.generation[genNum - 1][normalized.bestFitIndex].clone();
        //element 1 is a completely new individual
        this.generation[genNum][1] = this.makeNewIndividual();
    
        //format
        var fits2 = [];
        for (var i = 0; i < fits.length; i++) {
            fits2[i] = {
                "name": "a" + i,
                "val": fits[i]
            };
        }
    
        var rw = new RW({
            fitnesses: fits2,
            precision: 4
        });
        for (var i = 2; i < this.popSize; i++) {
            this.generation[genNum][i] = this.generation[genNum - 1][rw.spin()['index']].mateWith('SELF');
        }
    }

    makeNewIndividual() {
        var individual = new Rack(this.rackConfig);
        for (var j = 0; j < this.components.length; j++) {
            individual.add(this.components[j][0], this.components[j][1]);
        }
        individual.randomizeShelves();
        individual.fitComponents();
        return individual;
    }

    populate(){
        this.generation[0] = [];
        for (var i = 0; i < this.popSize; i++) {
            this.generation[0].push(this.makeNewIndividual());
        }
        this.nextGeneration = 1;
    }

    evolve(generationCount){
        for(var i=0; i<generationCount; i++ ){
            this.makeNewGeneration(this.nextGeneration);
            this.currentGeneration = this.nextGeneration;
            this.nextGeneration++;
        }
    }


}

module.exports = Evolver