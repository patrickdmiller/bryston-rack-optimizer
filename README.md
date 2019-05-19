# GA Bryston Rack Fitter

A genetic algorithm based Bryston rack component fitter.

[Bryston](http://bryston.com/) components go in a [Target rack](http://www.targetaudioproducts.com/component-stands.html) (owned by Bryston)

The problem is you want it to look nice distributed with no wasted space like this:

![rack picture](http://www.bryston.com/images/products/Active_System/L_4.png)

But it's a bit tricky
* The best looking rack wastes the least amount of space possible (imho). (i.e: The components sit very cleanly in the shelf spaces with no gaps)
* The shelves can only go in predefined spots
* You must have a minimum number of shelves, but you can add more into the empty slots as needed
* The shelves have weight limits (bottom is 150lbs, rest are 75lbs)
* You want the center of mass as low as possible (safer)
* The components have different heights, and two components stacked take up less space than 2 components alone (the face plates nest)
* Some components cannot be stacked—like 1/3 width components
* Some components like a CD player should go higher in the stack since you interact with them. (personal preference)


So, how do you best stack a Bryston rack with components given these variables and making it look as nice as possible? [Genetic algorithm](https://en.wikipedia.org/wiki/Genetic_algorithm) time!

## Example Use

```javascript
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
    size:1,//large rack
    popSize:10
}

var e = new Evolver(opts);
e.populate();
e.evolve(10000);
e.printGeneration();
```
Output :
```console

$ node app.js

   [bdp-pi]
 =======TOP========= , wasted: 0.00 -- weight: 2.60
   [bda-2]
 =======REGULAR========= , wasted: 0.25 -- weight: 12.50
   [bha-1]
 =======REGULAR========= , wasted: 0.29 -- weight: 13.25
   [bp-173]
   [bit15]
   [2.5b3]
 =======BOTTOM========= , wasted: 0.12 -- weight: 83.50
 =======GROUND========= , wasted: 0.00 -- weight: 0.00
```

## There are many TODOs
* There are some mutation probabilities that are currently hardcoded and should be parameters.
* Fitness function uses some factors between variables that should be optimized
* should account for heat (diff components shouldn't be stacked)
* allow for mating with other racks
* I don't have all of the components in the shared/components.js file. Also some measurements may be off. additions/corrections please!

