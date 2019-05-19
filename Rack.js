/*todos
    make nested height a function of the component its sitting on. stuff like BIT have different top clearance

    make mating work with racks that don't require a bottom/top shelf

    add the concept of "hooking up " components. in other words-- 2 cables from preamp go to amp, etc. We can then add fitness for amount of cable required. 

    add a bias for "similar components" being near eachother. for exmaple, someone might prefer 2 monoblock amps to be near each other for asthetic reasons? 

    add heat bias. amps need more ventilation

*/

var Utilities = require('./shared/utilities.js');

//constants
var MIN_SHELVES = 3;

//this is the definition of spaces on a rack, bottom-up. S = a shelf 1" thick, the other members are the cavity for that shelf. 
//so [S, 7, S, 5...] is a rack with a Shelf slot on the bottom, then 7" of cavity, then another SHelf slot
//size and weight are in imperial because that's what target/bryston use for docs... just keeping it consistent 

var S = 1; //indicates a shelf slot
var STRUCTURE = [
    [S, 7, S, 5, S, 3, S, 3, S], //small rack evs60
    [S, 11, S, 7, S, 5, S, 3, S, 3, S] //big rack evs90
]

//shelf weights according to targetAudio in lbs
var SHELF_TYPE_STRUCT = {
    "GROUND": {
        maxWeight: 9999 //the ground can basically hold infinite weight
    },
    "BOTTOM": {
        maxWeight: 150
    },
    "REGULAR": {
        maxWeight: 75
    },
    "TOP": {
        maxWeight: 75
    }
}

//a shelf in the rack
class Shelf {
    constructor(opts) {
        if (!opts || !opts.shelfType || !SHELF_TYPE_STRUCT[opts.shelfType])
            throw new TypeError('shelfType required parameter')
        this.shelfType = opts.shelfType;
        this.maxWeight = SHELF_TYPE_STRUCT[this.shelfType].maxWeight;
        this.shelfCavity = 0; //this is actually totalSpace the shelf has
        if (Number.isInteger(opts.shelfCavity))
            this.shelfCavity = opts.shelfCavity;
        this.components = [];
        this.totalWeight = 0;
        this.totalSpaceUsed = 0;
        this.heightFromGround = -1;
        if (Number.isInteger(opts.heightFromGround))
            this.heightFromGround = opts.heightFromGround;
        this.slotNumber = -2; //-1 = ground, 0  = bottom
        if (Number.isInteger(opts.slotNumber))
            this.slotNumber = opts.slotNumber;
        this.id;
        if (Number.isInteger(opts.id))
            this.id = opts.id;
    }

    //returns the total weight currently on the shelf
    computeTotalWeight() {
        var total = 0;
        for (var i = 0; i < this.components.length; i++) {
            total += this.components[i].component.w;
        }
        this.totalWeight = total;
        return total;
    }

    //returns total space used on this shelf
    computeSpaceUsed() {
        var total = 0;
        for (var i = 0; i < this.components.length; i++) {
            if (i == 0) {
                total += this.components[i].component.fh;
            } else {
                total += this.components[i].component.nh;
            }
        }
        this.totalSpaceUsed = total;
        return total;
    }

    //add a component to the shelf. if not randomizePosition, it puts it adds it to the shelf stack (top position)
    addComponent(component, randomizePosition) {
        if (randomizePosition == true && this.components.length > 0) {
            var position = Utilities.getRandomInt(0, this.components.length + 1);
            this.components.splice(position, 0, component);
        } else {
            this.components.push(component);
        }
        this.computeTotalWeight();
        this.computeSpaceUsed();
    }

    //returns if a shelf can hold a given component
    checkWeight(component) {
        if (this.totalWeight + component.component.w > this.maxWeight) {
            return false;
        }
        return true;
    }

    //returns if a shelf can fit a given component
    checkSpace(component) {
        if (this.components.length == 0) {
            if (component.component.fh <= (this.shelfCavity - this.totalSpaceUsed)) {
                return true;
            } else {
                return false;
            }
        } else {
            if (component.component.nh <= (this.shelfCavity - this.totalSpaceUsed)) {
                return true;
            } else {
                return false;
            }
        }
    }

    //return the amount of space wasted on a shelf (how much cavity is left)
    spaceWasted() {
        if (this.shelfType == "TOP")
            return 0
        return (this.shelfCavity - this.totalSpaceUsed);
    }

    //remove all components from a shelf, returns an array of their names
    emptyComponents(newSpaceAvailable) {
        var namesOfEmptiedComponents = [];
        for (var i = 0; i < this.components.length; i++) {
            namesOfEmptiedComponents.push(this.components[i].name);
        }
        this.components = [];
        this.totalWeight = 0;
        this.totalSpaceUsed = 0;
        this.shelfCavity = newSpaceAvailable;
        return namesOfEmptiedComponents;
    }
}

//rack
class Rack {
    constructor(opts) {
        if (!opts)
            opts = {};
        this.opts = opts; // for when we clone, easier to store opts and just pass them to new
        this.size = 0; //target racks come in 2 sizes. 0 = small, 1 = large
        if (Number.isInteger(opts.size))
            this.size = opts.size; // or 1 for large;

        //this is really a todo, but the algo should allow for racks without top and bottom shelves. Target says min 3 shelves, but doesn't specify their slots
        //currently everything was written to support this except for mating
        this.bottomShelfRequired = true;
        this.topShelfRequired = true;

        if (typeof opts.bottomShelfRequired !== 'undefined')
            this.bottomShelfRequired = opts.bottomShelfRequired;
        if (typeof opts.topShelfRequired !== 'undefined')
            this.topShelfRequired = opts.topShelfRequired;

        this.definition = STRUCTURE[this.size].slice(); //copy array using slice
        this.definitionWithShelves = [];
        this.definitionWithComponents = [];
        this.shelfStructure = [];
        this.components = [];
        this.componentNamesToComponentsIndex = [];
        this.componentsOnShelvesCount = 0;
        // this.fitness = 
        this.currentFitness = 'undefined';
    }

    //tag is not implemented currently
    add(componentName, tag) {
        if (typeof Utilities.components[componentName] === 'undefined')
            throw new TypeError('No component with that name: ' + componentName)
        this.components.push({
            name: componentName,
            component: Utilities.components[componentName]
        })
        this.componentNamesToComponentsIndex[componentName] = (this.components.length - 1);
    }

    //put shelves into the rack randomly
    randomizeShelves() {
        var slots = [];
        var startingSlot = 0;
        var shelfCount = 0;

        if (this.bottomShelfRequired) {
            startingSlot = 1;
            this.definition[0] = 0;
            shelfCount++;
        }

        var endingSlot = STRUCTURE[this.size].length;
        if (this.topShelfRequired) {
            endingSlot--;
            this.definition[this.definition.length - 1] = 0;
            shelfCount++;
        }

        for (var i = startingSlot; i < endingSlot; i++) {
            if (STRUCTURE[this.size][i] == S) {
                slots.push(i);
            }
        }

        var num_shelves = Utilities.getRandomInt(MIN_SHELVES - shelfCount, slots.length + 1);

        //need at least a min. 
        for (var i = 0; i < num_shelves; i++) {
            //which slots get a shelf?
            var shelf_slot_index = Utilities.getRandomInt(0, slots.length);
            this.definition[slots[shelf_slot_index]] = 0;
            slots.splice(shelf_slot_index, 1);
        }

        //this figures out an array of slot numbers so that shelves can know what slot they are in SHELF.slotNumber...
        var shelfAt = -1;
        var shelvesAt = [];
        for (var i = 0; i < this.definition.length; i++) {
            if (this.definition[i] == 1) {
                shelfAt++;
                continue;
            }

            if (this.definition[i] == 0) {
                shelfAt++;
                shelvesAt.push(shelfAt);
            }
        }

        this.spacesAvailable();

        var slotNumber;
        var heightFromGround = 0;
        this.shelfStructure[0] = new Shelf({
            shelfType: "GROUND",
            shelfCavity: this.definitionWithShelves[0],
            heightFromGround: heightFromGround,
            slotNumber: -1
        });
        for (var i = 1; i < this.definitionWithShelves.length; i++) {
            var shelfType = "REGULAR";
            if (i == 1) {
                shelfType = "BOTTOM";
            }
            if (i == this.definitionWithShelves.length - 1) {
                shelfType = "TOP";
            }
            heightFromGround += this.definitionWithShelves[i - 1] + 1; //1 because height of shelf is 1"
            this.shelfStructure[i] = new Shelf({
                shelfType: shelfType,
                shelfCavity: this.definitionWithShelves[i],
                heightFromGround: heightFromGround,
                slotNumber: shelvesAt[i - 1]
            });
        }
    }

    manualShelves(definition) {
        this.definition = definition.slice(0);
        // this.definitionWithShelves = definitionWithShelves;

        //this figures out an array of slot numbers so that shelves can know what slot they are in SHELF.slotNumber...
        var shelfAt = -1;
        var shelvesAt = [];
        for (var i = 0; i < this.definition.length; i++) {
            if (this.definition[i] == 1) {
                shelfAt++;
                continue;
            }

            if (this.definition[i] == 0) {
                shelfAt++;
                shelvesAt.push(shelfAt);
            }
        }

        this.spacesAvailable();
        var heightFromGround = 0;
        //always has a ground, even if we dont put stuff on it
        this.shelfStructure[0] = new Shelf({
            shelfType: "GROUND",
            shelfCavity: this.definitionWithShelves[0],
            heightFromGround: heightFromGround,
            slotNumber: -1
        });

        for (var i = 1; i < this.definitionWithShelves.length; i++) {
            var shelfType = "REGULAR";
            if (i == 1) {
                shelfType = "BOTTOM";
            }
            if (i == this.definitionWithShelves.length - 1) {
                shelfType = "TOP";
            }
            heightFromGround += this.definitionWithShelves[i - 1] + 1; //1 because height of shelf is 1"
            this.shelfStructure[i] = new Shelf({
                shelfType: shelfType,
                shelfCavity: this.definitionWithShelves[i],
                heightFromGround: heightFromGround,
                slotNumber: shelvesAt[i - 1]
            });
        }
    }

    deleteShelfAtIndex(index) {
        //get the slot number
        var slotNumber = this.shelfStructure[index].slotNumber;
        var shelfCounter = 0;

        for (var i = 0; i < this.definition.length; i++) {
            //we are on a shelf if...
            if (this.definition[i] == 0 || this.definition[i] == 1) {
                //deleting a shelf. it should be 0 before we delete it. if not something has gone terribly wrong
                if (this.definition[i] == 0 && shelfCounter == slotNumber) {
                    this.definition[i] = 1;
                    break;
                } else if (this.definition[i] == 1 && shelfCounter == slotNumber) {
                    throw new TypeError("tried to delete a shelf that isn't occupied");
                }
                shelfCounter++;
            }
        }

        //remove the shelf from the obj
        this.shelfStructure.splice(index, 1);
        //recompute spaces now that shelf is gone
        this.definitionWithShelves = [];
        this.spacesAvailable();

    }

    //compute total spaces with the racks in place
    //we should refactor this and rely completely on shelf class
    spacesAvailable() {
        var sum = 0;
        for (var i = 0; i < this.definition.length; i++) {
            if (this.definition[i] == 0) {
                this.definitionWithShelves.push(sum);
                sum = 0;
            } else {
                sum += this.definition[i];
            }
        }
        if (sum > 0) {
            //there was a shelf not at the top
        }
        this.definitionWithShelves.push(9999);
    }

    //put the components into shelves, whichComponents is an array of names of the components
    fitComponents(whichComponents) {
        // console.log(whichComponents);
        //pick a random spot!
        var toFit = this.components.length;
        //make a mutable array that points to the component indexes. we will slice them as we place them. 
        var toFitArray = [];
        for (var i = 0; i < toFit; i++) {
            toFitArray[i] = i;
        }

        if (typeof whichComponents !== 'undefined') {
            toFit = whichComponents.length;
            toFitArray = whichComponents;
        }

        var shelfIndexes = [];
        for (var i = 0; i < this.shelfStructure.length; i++) {
            shelfIndexes[i] = i;
        }

        for (var i = 0; i < toFit; i++) {
            //pick a random component
            var thisComponent = (toFitArray.splice(Utilities.getRandomInt(0, toFitArray.length), 1))[0];
            //make an array of shelf positions
            var shelvesToTry = [...shelfIndexes]; //copy
            while (shelvesToTry.length > 0) {
                var shelfToTry = (shelvesToTry.splice(Utilities.getRandomInt(0, shelvesToTry.length), 1))[0];
                
                //if the shelf can handle the component
                if (this.shelfStructure[shelfToTry].checkSpace(this.components[thisComponent]) &&
                    this.shelfStructure[shelfToTry].checkWeight(this.components[thisComponent])) {

                    this.shelfStructure[shelfToTry].addComponent(this.components[thisComponent], true);
                    this.componentsOnShelvesCount++;
                    break;
                }
            }
        }
    }

    //if we want to specify how components are on shelfs instead of randomly placing them
    manualFitComponents(shelfComponents) {
        for (var i = 0; i < this.shelfStructure.length; i++) {
            if (!shelfComponents[i]) {
                Utilities.log(1, "Attempting to fit empty ShelfComponents")
            }

            for (var j = 0; j < shelfComponents[i].length; j++) {
                this.shelfStructure[i].addComponent({
                    name: shelfComponents[i][j],
                    component: Utilities.components[shelfComponents[i][j]]
                });
                this.componentsOnShelvesCount++;
            }
        }
    }

    

    //score how components were placed
    calculatePlacementScores() {
        //we want to slightly reward things that have interactivity very high off the ground
        var interactionHeightScore = function(interactivity, heightFromGround) {
            var score = ((interactivity * heightFromGround) / 100);
            return score;
        }

        //for com calculations
        var masses = [];
        var top = 0;
        var bottom = 0.0001;

        //we will also compute the interactivity boost here
        var totalInteractivityScore = 0;

        for (var i = 1; i < this.shelfStructure.length; i++) { //start at 1. 0 is the ground
            if (this.shelfStructure[i].components.length > 0) {
                var heightOnRack = this.shelfStructure[i].heightFromGround;
                for (var j = 0; j < this.shelfStructure[i].components.length; j++) {
                    masses.push({
                        "h": heightOnRack,
                        "m": this.shelfStructure[i].components[j].component.w
                    });
                    totalInteractivityScore += interactionHeightScore(this.shelfStructure[i].components[j].component.interactivity, heightOnRack)
                    top += (heightOnRack * this.shelfStructure[i].components[j].component.w);
                    bottom += this.shelfStructure[i].components[j].component.w;
                    if (j == 0) {
                        heightOnRack += this.shelfStructure[i].components[j].component.fh;
                    } else {
                        heightOnRack += this.shelfStructure[i].components[j].component.nh;
                    }
                }
            }
        }

        return {
            'com': (top / bottom),
            'interactivity': totalInteractivityScore
        };
    }

    fitness() {
        //closer to 0 the higher the fitness

        //wasted space is a bad fitness
        var wasted = 0;
        for (var i = 0; i < this.shelfStructure.length; i++) {
            wasted += this.shelfStructure[i].spaceWasted();
        }

        //we want center of mass as low as possible and interactive components as high as possible. (a cd player shouldn't be the lowest point)
        var comAndIntScore = this.calculatePlacementScores();
        var comScore = comAndIntScore['com'];
        var interactivityScore = comAndIntScore['interactivity'];

        //if it failed to place a component its really unfit. 
        var didntFit = this.components.length - this.componentsOnShelvesCount;

        //let's prefer more shelves vs a bunch of components stacked up on top of each other
        var shelfScore = -(this.shelfStructure.length - 1) / 5;

        //let's see if there's any non stackable under something. this would be very unfit. it's like trying to put a component on top of a bdp-pi. it's possible but gross.
        var stackScore = 0;
        for (var i = 0; i < this.shelfStructure.length; i++) {
            for (var j = 0; j < this.shelfStructure[i].components.length; j++) {
                if (this.shelfStructure[i].components[j].component.stackable === false && j < (this.shelfStructure[i].components.length - 1)) {
                    stackScore = 50;
                }
            }
        }

        // these coefficients are just from my head
        var fitness = wasted + (didntFit * 10) + (comScore / 5) + 1 / (1 + interactivityScore) + stackScore + shelfScore;
        var currentFitness = fitness; // cache it in case you dont want to compute it every time you read the val. 

        return fitness
    }

    print() {
        for (var i = this.shelfStructure.length - 1; i >= 0; i--) {
            for (var j = this.shelfStructure[i].components.length - 1; j >= 0; j--) {
                console.log("   [" + this.shelfStructure[i].components[j].name + "]");
            }
            console.log(" =======" + this.shelfStructure[i]['shelfType'] + "========= , wasted: " + this.shelfStructure[i].spaceWasted().toFixed(2) + " -- weight: " + this.shelfStructure[i].totalWeight.toFixed(2));
        }
        console.log("TOTAL: " + this.fitness())
    }

    //create a clone of this object
    clone() {
        var c = new Rack(this.opts);
        for (var i = 0; i < this.components.length; i++) {
            c.add(this.components[i].name);
        }
        c.manualShelves(this.definition);
        var shelfComponentArray = [];
        for (var i = 0; i < this.shelfStructure.length; i++) {
            shelfComponentArray[i] = [];
            for (var j = 0; j < this.shelfStructure[i].components.length; j++) {
                shelfComponentArray[i].push(this.shelfStructure[i].components[j].name);
            }
        }
        c.manualFitComponents(shelfComponentArray)
        return c
    }


    mateWith(partner) {
        //for now, only allow for self mating
        if (partner === "SELF") {
            //make a copy
            var r = this.clone();

            //the chance a shelf mutation (added or deleted)
            var shelfMutationRate = 20; //20%
            var roll = Utilities.getRandomInt(0, 100);
            //if a shelf mutation happens. 
            if (roll < shelfMutationRate) {

                //0 or 1
                if (Utilities.getRandomInt(0, 2) < 1) {
                    //Deleting a shelf.
                    if (r.shelfStructure.length > (MIN_SHELVES + 1)) {
                        //figure out which shelves are eligible for deletion
                        var max = r.shelfStructure.length;
                        var min = 1;
                        if (r.topShelfRequired == true) {
                            max--;
                        }
                        if (r.bottomShelfRequired == true) {
                            min++;
                        }
                        var shelfToRemove = Utilities.getRandomInt(min, max);
                        // what are the components on this shelf? build a hash so we can fit them somewhere else after deletion
                        var componentIndexes = [];
                        for (var i = 0; i < r.shelfStructure[shelfToRemove].components.length; i++) {
                            componentIndexes.push(r.componentNamesToComponentsIndex[r.shelfStructure[shelfToRemove].components[i].name]);
                        }

                        r.componentsOnShelvesCount -= componentIndexes.length;
                        r.deleteShelfAtIndex(shelfToRemove);
                        r.fitComponents(componentIndexes)
                    } else {
                        // there's no eligible shelf to delete
                    }
                } else {
                    //Adding a shelf
                    // are there any open slots to put a shelf?
                    if (r.definition.indexOf(1) > -1) {
                        var shelfSlots = [];
                        var slotNumber = -1;
                        //compute slotnumbers
                        for (var i = 0; i < r.definition.length; i++) {
                            if (r.definition[i] == 0 || r.definition[i] == 1) {
                                slotNumber++;
                            }
                            if (r.definition[i] == 1) {
                                shelfSlots.push([i, slotNumber]);
                            }
                        }
                        var slotToInsertAShelfInto = Utilities.getRandomInt(0, shelfSlots.length);
                        // console.log("insert into ", shelfSlots[slotToInsertAShelfInto])
                        r.definition[shelfSlots[slotToInsertAShelfInto][0]] = 0;
                        //now we need to update the spacesAvailable
                        r.definitionWithShelves = [];
                        r.spacesAvailable();
                        //if it's not the bottom we are inserting, we need to empty the below it and split those bad boys up
                        var componentIndexes = [];
                        if (shelfSlots[slotToInsertAShelfInto][0] > 0) {
                            for (var i = 0; i < r.shelfStructure.length; i++) {
                                if (r.shelfStructure[i].slotNumber > shelfSlots[slotToInsertAShelfInto][1]) {
                                    //the previous one is the one to empty
                                    var namesOfEmptiedComponents = r.shelfStructure[i - 1].emptyComponents(r.definitionWithShelves[i - 1]);
                                    for (var j = 0; j < namesOfEmptiedComponents.length; j++) {
                                        componentIndexes.push(r.componentNamesToComponentsIndex[namesOfEmptiedComponents[j]]);
                                    }
                                    r.componentsOnShelvesCount -= componentIndexes.length;
                                    //now we must insert the shelf
                                    var shelfType = "REGULAR";
                                    //TODO right now this only works when top and bottom are forced. 
                                    if (r.topShelfRequired == false || r.bottomShelfRequired == false)
                                        throw new TypeError("matesWith currently only supports top and bottom shelf'd racks")
                                    r.shelfStructure.splice(i, 0, new Shelf({
                                        shelfType: shelfType,
                                        shelfCavity: r.definitionWithShelves[i],
                                        heightFromGround: r.definitionWithShelves[i - 1] + 1,
                                        slotNumber: shelfSlots[slotToInsertAShelfInto][1]
                                    }));
                                    //you should also add anything that didn't fit initially becuase now you have an extra shelf
                                    r.fitComponents(componentIndexes);
                                    break;
                                }
                            }
                        }
                    } else {
                        // rack cannot accept any more shelves.
                    }
                }
            }

            var componentMutationRate = 50; //50%
            var roll = Utilities.getRandomInt(0, 100);
            //if component mutation (attempt)
            if (roll < componentMutationRate) {
                //pick a random component and move it to somewhere random!
                //first a random shelf
                var randomShelf = r.shelfStructure[Utilities.getRandomInt(1, r.shelfStructure.length)]; // start at 1 because 0 is ground :x
                if (randomShelf.components.length > 0) {
                    //now a random component
                    var randomComponent = randomShelf.components[Utilities.getRandomInt(0, randomShelf.components.length)];
                    var component = randomShelf.components.splice(randomComponent, 1)[0];
                    randomShelf.computeTotalWeight();
                    randomShelf.computeSpaceUsed();
                    r.componentsOnShelvesCount--;
                    var componentIndexes = [r.componentNamesToComponentsIndex[component.name]];
                    //fit it somewhere randomly
                    r.fitComponents(componentIndexes)
                }
            }
            //return our new offspring
            return r;
        } else {
            console.log("TODO: mateWith another individual")
        }
    }
}
module.exports = Rack