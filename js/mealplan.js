"use strict";

const ingKey = "ingredients";
const recKey = "recipes";
const calKey = "calendar";

class FTCalendar {
	constructor(ftool) {
		this.ftool = ftool;
		// TODO remove outdated entries?
		this.calarr = [];
	}

	loadSaved() {
		let saved = window.localStorage.getItem(calKey);
		if (saved === null) {
			return;
		}

		this.calarr = JSON.parse(saved);
	}

	doSave() {
		window.localStorage.setItem(
			calKey,
			JSON.stringify(this.calarr)
		);
	}
}

class FTRecipes {
	//
	// ingobj {name:"", serves:0, ing:[{name: "", amount: 0.0}], notes:""}
	//

	constructor(ftool) {
		this.ftool = ftool;
		this.recarr = [];

		let that=this;
		// hook add ing in new recipe
		document.getElementById("recaddingbtn").addEventListener("click", function() {
			let tmplt = document.querySelector('#ingrediententry_t_ed');
			let parnt = document.querySelector('#recingtable');
			let clone = document.importNode(tmplt.content, true);

			// set up listener for button
			let sitem = clone.querySelector(".ingrediententry_t_ed_entry");
			sitem.querySelector('.btn-floating').addEventListener("click", function() {
				parnt.removeChild(sitem);
			}, false);
			

			// set up listener for select
			let selectopt = sitem.querySelector(".ingname");
			selectopt.addEventListener("change", function(evt) {
				// get the associated ing and fill things out
				let price = 0;
				let unit = "???";
				let ing = that.ftool.ingredients.get(evt.target.value);
				let amount = parseFloat(sitem.querySelector(".ingamount").value);
				if (ing !== null) {
					price = ing.price;
					unit = ing.unit;
				}
				sitem.querySelector('.ingunits').textContent = unit+'s';
				sitem.querySelector('.ingprice').textContent = (ing !== null)?"$"+price.toFixed(2):"$?";
				sitem.querySelector('.ingunit').textContent = unit;
				sitem.querySelector('.ingpricep').textContent = (ing !== null)?"$"+(price * amount).toFixed(2):"$?";
			}, false);

			// set up listener for amount
			sitem.querySelector(".ingamount").addEventListener("change", function(evt) {
				// change the values
				let price = 0;
				let unit = "???";
				let ing = that.ftool.ingredients.get(sitem.querySelector('.ingname').value);
				let amount = parseFloat(evt.target.value);
				if (ing !== null) {
					price = ing.price;
					unit = ing.unit;
				}
				sitem.querySelector('.ingunits').textContent = unit+'s';
				sitem.querySelector('.ingprice').textContent = (ing !== null)?"$"+price.toFixed(2):"$?";
				sitem.querySelector('.ingunit').textContent = unit;
				sitem.querySelector('.ingpricep').textContent = (ing !== null)?"$"+(price * amount).toFixed(2):"$?";
			}, false);


			parnt.insertBefore(sitem, parnt.children[parnt.children.length - 1]);
		}, false);

		// hook new recipe
		document.getElementById("recadd").addEventListener("click", function() {
			let name = document.getElementById("rectitle").value;
			let serves = parseInt(document.getElementById("recserve").value);
			let notes = document.getElementById("recnotes").value;
			let ing = [];
			let ingtab = document.getElementById("recingtable");
			let ingentries = ingtab.querySelectorAll(".ingrediententry_t_ed_entry");
			ingentries.forEach(function(el) {
				let ingname = el.querySelector(".ingname").value;
				let ingamount = parseFloat(el.querySelector(".ingamount").value);
				ing.push({name: ingname, amount: ingamount});
			});
			let obj = {name: name, serves: serves, ing: ing, notes: notes};
			that.add(obj);
		}, false);
	}

	recalcCosts() {
		// gets called when ingredients are updated/added/removed
		// so costs could have changed
		//TODO
	}

	addlists(recobj) {
		// add to the full list
		let tmplt = document.querySelector('#recipe_t');
		let parnt = document.querySelector('#reclist');
		let clone = document.importNode(tmplt.content, true);
		// fill out the template
		let cost = 0.0;
		// fill out the ingredients table
		let ingtab = clone.querySelector(".rec_t_ingtab");
		let ingtpt = document.querySelector("#ingrediententry_t");
		let that = this;
		recobj.ing.forEach(function(ingent) {
			let price = 0;
			let unit = "???";
			let totcost = 0;
			let ing = that.ftool.ingredients.get(ingent.name);
			if (ing !== null) {
				price = ing.price;
				unit = ing.unit;
				totcost = price * ingent.amount;
				cost += totcost;
			}
			let ingcln = document.importNode(ingtpt.content, true);
			let spans = ingcln.querySelectorAll('span');
			
			spans[0].textContent = ingent.name;
			spans[1].textContent = ingent.amount;
			spans[2].textContent = unit +"s";
			spans[3].textContent = (ing !== null) ? "$"+price.toFixed(2) : "???";
			spans[4].textContent = unit;
			spans[5].textContent = (ing !== null) ? "$"+totcost.toFixed(2) : "???";

			ingtab.appendChild(ingcln);
		});
		clone.querySelector(".rec_t_title").textContent = recobj.name;
		clone.querySelector(".rec_t_cost").textContent = "$" + ((cost === null) ? "???" : cost.toFixed(2));
		clone.querySelector(".rec_t_serves").textContent = recobj.serves;
		clone.querySelector(".rec_t_perserv").textContent = (cost === null) ? "???" : cost / recobj.serves;
		clone.querySelector(".rec_t_notes").textContent = recobj.notes;
		

		// enable the buttons
		let buttons = clone.querySelectorAll('a');
		buttons[0].addEventListener("click", function() {
			// put recobj up in the new ingredient area
			//TODO

			// remove the old entry
			that.rem(recobj.name);
			// open and focus
			M.Collapsible.getInstance(
				document.getElementById("reclist")
			).open(0);
			document.getElementById("rectitle").focus();
		}, false);
		buttons[1].addEventListener("click", function() {
			that.rem(recobj.name);
		}, false);

		parnt.appendChild(clone);
	}

	add(recobj) {
		// Do checks
		let exists = false;
		this.recarr.forEach(function (obj) {
			if (obj.name === recobj.name) {
				exists = true;
			}
		});
		if (exists || recobj.name === "" || recobj.name == undefined) {
			M.toast({html:"Recipe "+recobj.name+" already exisits", classes:"red"});
			return;
		}

		this.recarr.push(recobj);

		this.addlists(recobj);
	}

	rem(recname) {
		for (let i=0; i<this.recarr.length; i++) {
			if (this.recarr[i].name === recname) {
				// remove from full list
				let parnt = document.querySelector('#reclist');
				let ingentries = parnt.querySelectorAll(".recipe_t_entry");
				ingentries.forEach(function(el) {
					if (el.querySelector('.rec_t_title').textContent === recname) {
						parnt.removeChild(el);
					}
				});

				// remove from list
				this.recarr.splice(i, 1);
				return;
			}
		}
	}

	loadSaved() {
		let saved = window.localStorage.getItem(recKey);
		if (saved === null) {
			return;
		}

		this.recarr = JSON.parse(saved);
	}

	doSave() {
		window.localStorage.setItem(
			recKey,
			JSON.stringify(this.recarr)
		);
	}
}

class FTingredients {
	//
	// ingobj {name:"", price:0.0, unit:""}
	//

	constructor(ftool) {
		this.ftool = ftool;
		// array of ingrediants
		this.ingarr = [];

		let that=this;
		// hook new ingredient
		document.getElementById("ingadd").addEventListener("click", function() {
			let name = document.getElementById("ingtitle").value;
			let price = parseFloat(document.getElementById("ingprice").value);
			let unit = document.getElementById("ingunit").value;
			let obj = {name: name, price: price, unit: unit}
			that.add(obj);
		}, false);
	}

	addlists(ingobj) {
		// add to the full list
		let tmplt = document.querySelector('#ingredient_t');
		let parnt = document.querySelector('#inglist');
		let clone = document.importNode(tmplt.content, true);
		// fill out the template
		let spans = clone.querySelectorAll('span');
		spans[0].textContent = ingobj.name;
		spans[1].textContent = "$"+(ingobj.price.toFixed(2));
		spans[2].textContent = ingobj.unit;

		// enable the buttons
		let buttons = clone.querySelectorAll('a');

		let that = this;
		buttons[0].addEventListener("click", function() {
			// put ingobj up in the new ingredient area
			document.getElementById("ingtitle").value = ingobj.name;
			document.getElementById("ingprice").value = ingobj.price;
			document.getElementById("ingunit").value= ingobj.unit;

			// remove the old entry
			that.rem(ingobj.name);
			// open and focus
			M.Collapsible.getInstance(
				document.getElementById("inglist")
			).open(0);
			document.getElementById("ingtitle").focus();
		}, false);
		buttons[1].addEventListener("click", function() {
			that.rem(ingobj.name);
		}, false);

		parnt.appendChild(clone);

		/*// update the selects
		let sels = document.querySelectorAll(".ingoptions");
		sels.forEach(function(el) {
			let opt = document.createElement("option");
			opt.text = ingobj.name;
			el.add(opt);
		});*/
	}

	add(ingobj) {
		// do checks
		let exists = false;
		this.ingarr.forEach(function (obj) {
			if (obj.name === ingobj.name || ingobj.name == undefined) {
				exists = true;
			}
		});
		if (exists || ingobj.name === "") {
			M.toast({html:"Ingredient "+ingobj.name+" already exisits", classes:"red"});
			return;
		}

		this.ingarr.push(ingobj);

		this.addlists(ingobj);

		// pass on any needed info to the recipes
		this.ftool.recipes.recalcCosts();
	}

	rem(ingname) {
		for (let i=0; i<this.ingarr.length; i++) {
			if (this.ingarr[i].name === ingname) {
				// remove from full list
				let parnt = document.querySelector('#inglist');
				let ingentries = parnt.querySelectorAll(".ingredient_t_entry");
				ingentries.forEach(function(el) {
					if (el.querySelector('span').textContent === ingname) {
						parnt.removeChild(el);
					}
				});

				/*// remove from selects
				let sels = document.querySelectorAll(".ingoptions");
				sels.forEach(function(el) {
					for (let j=0; j<el.options.length; j++) {
						if (el.options[j].text === ingname) {
							el.remove(j);
							break;
						}
					}
				});*/

				// remove from list
				this.ingarr.splice(i, 1);
				return;
			}
		}

		// pass on any needed info to the recipes
		this.ftool.recipes.recalcCosts();
	}

	get(ingname) {
		for (let i=0; i<this.ingarr.length; i++) {
			if (this.ingarr[i].name === ingname) {
				return this.ingarr[i];
			}
		}
		return null;
	}

	loadSaved() {
		let saved = window.localStorage.getItem(ingKey);
		if (saved === null) {
			return;
		}

		this.ingarr = JSON.parse(saved);
	}

	doSave() {
		window.localStorage.setItem(
			ingKey,
			JSON.stringify(this.ingarr)
		);
	}
}

class FoodTool {
	constructor() {
		this.calendar = new FTCalendar(this);
		this.recipes = new FTRecipes(this);
		this.ingredients = new FTingredients(this);
	}

	loadSaved() {
		// get the stored data
		this.ingredients.loadSaved();
		this.recipes.loadSaved();
		this.calendar.loadSaved();
	}
}


// main
// wrap this in a (function() { ... })();
// after debugging

// create our foodtool
let ft = new FoodTool();

// load existing data
ft.loadSaved();

// materialize initializations
M.Tabs.init(
	document.getElementById("main-tabs"),
	{
		swipeable: true
	}
);

M.Collapsible.init(
	document.querySelectorAll('.collapsible'),
	{}
);

// adjust the containers
document.querySelector('.carousel').style.height = "100vh";

// debug add a few ingredients and recipes
ft.ingredients.add({
	name:"Bananas", price:0.25, unit:"Banana"
});
