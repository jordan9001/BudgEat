"use strict";

const ingKey = "ingredients";
const recKey = "recipes";
const calKey = "calendar";

class FTCalendar {
	//
	// mealobj = {recipe="", servings=0, cdate=""}
	//

	constructor(ftool) {
		this.ftool = ftool;
		// TODO remove outdated entries?
		this.calarr = [];

		// initialize the calendar numbers
		let calnode = document.getElementById("calbod");
		let daytemp = document.getElementById("calcell_t");
		let sumtemp = document.getElementById("calsum_t");
		for (let week = 0; week < 5; week++) {
			let row = document.createElement('tr');
			for (let day = 0; day < 7; day++) {
				let clone = document.importNode(daytemp.content, true);
				let hvrble = clone.querySelector(".hoverable");
				hvrble .addEventListener("click", function() {
					document.getElementById("addmeal_date").value = hvrble.querySelector(".datenum").dataset.cdate;
				}, false);
				row.appendChild(clone);
			}
			row.appendChild(document.importNode(sumtemp.content, true));
			calnode.appendChild(row);
		}

		
		this.mondayfirst = true;
		let d = new Date();

		d.setDate(d.getDate() - ((d.getDay() + 6)%7));

		let dates = calnode.querySelectorAll(".datenum");

		dates.forEach(function(el) {
			el.textContent = d.getDate();
			el.dataset.cdate = ""+
							d.getFullYear() +"-"+
							("" + (d.getMonth() + 1)).padStart(2, '0') +"-"+
							(""+d.getDate()).padStart(2, '0');
			d.setDate(d.getDate() + 1);
		});

		let costs = calnode.querySelectorAll(".daysum");
		costs.forEach(function(el) {
			el.textContent = "";
		});

		let weekcosts = calnode.querySelectorAll(".calsum");
		weekcosts.forEach(function(el) {
			el.textContent = "$0.00";
		});

		// set up add meal listener
		let that = this;
		document.getElementById("addmeal_btn").addEventListener("click", function() {
			let cdate = document.getElementById("addmeal_date").value;
			let servings = parseFloat(parseFloat(document.getElementById("addmeal_serv").value).toFixed(2));
			let recipe = document.getElementById("addmeal_rec").value;
			let obj = {recipe: recipe, servings: servings, cdate: cdate};
			that.add(obj);
		}, false);


		// set up getlist listener when date range changes
		document.getElementById("getlist_btn").addEventListener("click", function() {
			let bdstr = document.getElementById("getlist_sdate").value;
			let edstr = document.getElementById("getlist_edate").value;

			if (bdstr.trim() === "" || edstr.trim() === "") {
				M.toast({html:"Invalid date for Shopping List", classes:"red"});
				return;
			}

			let bd = new Date(bdstr);
			let ed = new Date(edstr);
			
			if (bd.toString() === "Invalid Date") {
				M.toast({html:"Invalid Start Date for Shopping List", classes:"red"});
				return;
			}

			if (ed.toString() === "Invalid Date") {
				M.toast({html:"Invalid End Date for Shopping List", classes:"red"});
				return;
			}

			if (ed < bd) {
				M.toast({html:"Invalid date range for Shopping List", classes:"red"});
				return;
			}

			let inglist = {};
			// dictionary by ing name {Bananas: {amount: 7.2, unit: "Banana", priceper: 0.4}

			that.calarr.forEach(function(mealobj) {
				let rd = new Date(mealobj.cdate);

				if (rd <= ed && rd >= bd) {
					let recobj = that.ftool.recipes.get(mealobj.recipe);
					if (recobj === null) {
						console.log("Unable to get recipe \""+mealobj.recipe +"\" for list");
					} else {
						// go through the ingredients and add them all to the thing
						recobj.ing.forEach(function(ingent) {
							
							let ingobj = that.ftool.ingredients.get(ingent.name);

							if (inglist[ingent.name] === undefined) {
								let unit = "unit";
								let price = 0.0;
								if (ingobj !== null) {
									unit = ingobj.unit;
									price = ingobj.price;
								}
								inglist[ingent.name] = {amount: 0.0, unit: unit, priceper: price};
							}

							inglist[ingent.name].amount += (ingent.amount * mealobj.servings / recobj.serves);
						});
					}
				}
			});

			// now with our list we can build the text
			//
			//	Shopping list (05/08 - 08/05)			 Est. Total = $2.88
			//    - Bananas: 7.2 Banana            @ $0.40 / Banana = $2.88
			//

			// left side of the list
			let shopl = ["Shopping List ("+ bd.toDateString() +" - " + ed.toDateString() +")"]
			// right side
			let shopr = ["Est. Total = $"]
			// that way we can give the proper spacing on stuff

			let totcost = 0.0;
			let keys = Object.keys(inglist);
			let maxl = shopl[0].length;
			let maxr = shopr[0].length + 6;
			for (let i = 0; i < keys.length; i++) {
				let cleanamt = parseFloat(inglist[keys[i]].amount.toFixed(2));
				let unit = inglist[keys[i]].unit;
				let l = "  - "+ keys[i] +": "+ cleanamt +" "+ unit +"s";
				let cost = inglist[keys[i]].priceper * cleanamt;
				totcost += cost;
				let r = "@ $"+ inglist[keys[i]].priceper.toFixed(2) +" / "+ unit +" = $"+ cost.toFixed(2);
			
				if (l.length > maxl) {
					maxl = l.length;
				}
				if (r.length > maxr) {
					maxr = r.length;
				}
				shopl.push(l);
				shopr.push(r);
			}
			shopr[0] += totcost.toFixed(2);
			if (shopr[0].length > maxr) {
				maxr = shopr[0];
			}

			let ftext = "";
			let linlen = maxl + maxr + 1;
			for (let i = 0; i < shopl.length; i++) {
				let padcount = linlen - (shopl[i].length + shopr[i].length);
				let l = shopl[i] + " ".repeat(padcount) + shopr[i];
				ftext += l + "\r\n";
			}

			let file = new Blob([ftext], {type: "text/plain"});
			let a = document.createElement('a');
			let url = URL.createObjectURL(file);
			a.href = url;
			a.download = "List_"+ (bd.getMonth()+1) +"/"+ (bd.getUTCDate()) +"-"+ (ed.getMonth()+1) +"/"+ (ed.getUTCDate()) +".txt";
			document.body.appendChild(a);
			a.click();
			setTimeout(function() {
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);  
			}, 0); 
			
		}, false);
		
	}

	recalcCosts(recname, updateall=false) {
		// lazy way
		// ignore recname, just do all the prices
		let cal = document.getElementById("calbod");

		let that = this;
		// for each week
		let weeks = cal.querySelectorAll("tr");
		weeks.forEach(function(el) {
			let days = el.querySelectorAll(".calcell");
			let weekcost = 0;
			// for each day
			days.forEach(function(dayel) {
				let meals = dayel.querySelectorAll(".calmealname");
				let daycost = 0;
				// for each meal
				meals.forEach(function(mealel) {
					let s = mealel.textContent;
					let recname = s.substring(0, s.lastIndexOf('('))
					let servings = s.substring(s.lastIndexOf('('))
					servings = parseFloat(servings.substring(1, servings.length - 1));

					let mealcost = that.ftool.recipes.cost(recname, servings);
					if (mealcost === null) {
						daycost = null;
						weekcost = null;
					} else {
						if (daycost != null) {
							daycost += mealcost;
						}
						if (weekcost != null) {
							weekcost += mealcost;
						}
					}
				});

				let daycostel = dayel.querySelector(".daysum");

				if (daycost === null) {
					daycostel.textContent = "???";
				} else if (daycost === 0) {
					daycostel.textContent = "";
				} else {
					daycostel.textContent = "$" + daycost.toFixed(2);
				}
			});

			let weekcostel = el.querySelector(".calsum");

			if (weekcost === null) {
				weekcostel.textContent = "???";
			} else if (weekcost === 0) {
				weekcostel.textContent = "";
			} else {
				weekcostel.textContent = "$" + weekcost.toFixed(2);
			}
		});

		
	}

	addlists(mealobj) {
		// add to the full list
		let tmplt = document.querySelector('#meal_t');
		// get the right parent
		let cells = document.querySelectorAll(".calcell");
		let parnt = null;
		cells.forEach(function(el) {
			if (el.querySelector('.datenum').dataset.cdate === mealobj.cdate) {
				parnt = el.querySelector('ul');
			}
		});
		
		if (parnt == null) {
			// out of date range
			console.log("Recipe for date out of calendar "+ mealobj.cdate);
			return;
		}

		let clone = document.importNode(tmplt.content, true);
		// fill out the template
		
		clone.querySelector("span").textContent = mealobj.recipe + "(" + mealobj.servings + ")";

		// enable the button
		let cli = clone.querySelector("li");
		let that = this;
		clone.querySelector('a').addEventListener("click", function() {
			parnt.removeChild(cli);
			// remove the old entry
			that.rem(mealobj);
		}, false);

		parnt.appendChild(clone);
	}

	add(mealobj) {
		// Do checks
		mealobj.recipe = mealobj.recipe.trim();
		if (mealobj.recipe === "" || mealobj.recipe == undefined) {
			M.toast({html:"Recipe name required", classes:"red"});
			return;
		}
		if (isNaN(mealobj.servings)) {
			M.toast({html:"Invalid servings served", classes:"red"});
			return;
		}
		let d = Date(mealobj.cdate);
		if (mealobj.cdate.trim() === "" || d < Date.now()) {
			M.toast({html:"Invalid date", classes:"red"});
			return;
		}

		this.calarr.push(mealobj);

		this.addlists(mealobj);

		this.recalcCosts("", true);

		this.doSave();
	}

	rem(mealobj) {
		for (let i = 0; i < this.calarr.length; i++) {
			if (mealobj === this.calarr[i]) {
				this.calarr.splice(i, 1);
				break;
			}
		}
		
		this.recalcCosts("", true);

		this.doSave();
	}

	loadSaved() {
		let saved = window.localStorage.getItem(calKey);
		if (saved === null) {
			return;
		}

		this.calarr = JSON.parse(saved);

		// add them all
		let that = this;
		this.calarr.forEach(function(mealobj) {
			that.addlists(mealobj);
		});

		this.recalcCosts("", true);
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

	recalcCosts(ingname, updateall=false) {
		// gets called when ingredients are updated/added/removed
		// so costs could have changed
		// any recipe effected should call recalcCosts in the calendar
		
		// loop through all our recipes, and find any that depend on the ing
		let recnodes = document.querySelectorAll(".recipe_t_entry");
		let that = this;
		this.recarr.forEach(function(recobj) {
			let changed = false;
			let cost = 0.0;
			// first find the html node
			let node = null;
			for (let i=0; i<recnodes.length; i++) {
				if (recnodes[i].querySelector(".rec_t_title").textContent.trim() === recobj.name) {
					node = recnodes[i];
					break;
				}
			}
			if (node === null) {
				console.log("Bad! Recipe array and html are out of sync");
				return;
			}

			recobj.ing.forEach(function(ingent) {
				let price = 0;
				let unit = "???";
				let totcost = 0;
				let ing = that.ftool.ingredients.get(ingent.name);
				if (ing !== null) {
					price = ing.price;
					unit = ing.unit;
					totcost = price * ingent.amount;
					if (cost != null) {
						cost += totcost;
					}
				} else {
					// we have an unknown ingrediant, so the cost is unknown
					cost = null;
				}
				// if this ingrediant is the one we are looking for, we have to update it's html node as well
				if (updateall || ingname.toLowerCase() == ingent.name.toLowerCase()) {
					changed = true;

					// find it's html node
					let ingnodes = node.querySelectorAll(".ingrediententry_t_entry");
					for (let i=0; i<ingnodes.length; i++) {
						let spans = ingnodes[i].querySelectorAll("span");
						if (spans[0].textContent === ingent.name) {
							// correct it
							spans[1].textContent = ingent.amount;
							spans[2].textContent = unit +"s";
							spans[3].textContent = (ing !== null) ? "$"+price.toFixed(2) : "???";
							spans[4].textContent = unit;
							spans[5].textContent = (ing !== null) ? "$"+totcost.toFixed(2) : "???";
						}
					}
				}
			});

			if (changed) {
				// update the overall as well.
				node.querySelector(".rec_t_cost").textContent = "$" + ((cost === null) ? "???" : cost.toFixed(2));
				node.querySelector(".rec_t_perserv").textContent = (cost === null) ? "???" : cost / recobj.serves;

				that.ftool.calendar.recalcCosts(recobj.name);
			}
		});
		// update the recipe being added as well

	}

	cost(recname, servings) {
		let recobj = this.get(recname);
		if (recobj == null) {
			return null;
		}

		let cost = 0;
		for (let i = 0; i < recobj.ing.length; i++) {
			let ing = this.ftool.ingredients.get(recobj.ing[i].name);
			if (ing === null) {
				cost = null;
				return null;
			}

			cost += ing.price * recobj.ing[i].amount;
		}

		cost = cost * servings / recobj.serves;

		return cost;
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
				if (cost != null) {
					cost += totcost;
				}
			} else {
				// we have an unknown ingrediant, so the cost is unknown
				cost = null;
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
		recobj.name = recobj.name.trim();
		if (this.get(recobj.name) !== null) {
			M.toast({html:"Recipe "+recobj.name+" already exisits", classes:"red"});
			return;
		}
		if (recobj.name === "" || recobj.name == undefined) {
			M.toast({html:"Recipe name required", classes:"red"});
			return;
		}
		if (isNaN(recobj.serves)) {
			M.toast({html:"Invalid Amount served for Recipe", classes:"red"});
			return;
		}

		this.recarr.push(recobj);

		this.addlists(recobj);

		this.ftool.calendar.recalcCosts(recobj.name);

		this.doSave();
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
				this.ftool.calendar.recalcCosts(recname);
				this.doSave();
				return;
			}
		}
	}

	get(recname) {
		recname = recname.trim().toLowerCase();
		for (let i=0; i<this.recarr.length; i++) {
			if (this.recarr[i].name.toLowerCase() === recname) {
				return this.recarr[i];
			}
		}
		return null;
	}

	loadSaved() {
		let saved = window.localStorage.getItem(recKey);
		if (saved === null) {
			return;
		}

		this.recarr = JSON.parse(saved);
		let that = this;
		this.recarr.forEach(function(recobj) {
			that.addlists(recobj);
		});
		//this.ftool.calendar.recalcCosts(recobj.name, true);
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
		ingobj.name = ingobj.name.trim();
		// do checks
		if (this.get(ingobj.name) !== null) {
			M.toast({html:"Ingredient "+ingobj.name+" already exisits", classes:"red"});
			return;
		}
		if (ingobj.name === "" || ingobj.name == undefined) {
			M.toast({html:"Ingredient name required", classes:"red"});
			return;
		}
		if (isNaN(ingobj.price)) {
			M.toast({html:"Invalid price for Ingredient", classes:"red"});
			return;
		}
		if (ingobj.unit.trim() === "") {
			M.toast({html:"Invalid unit for Ingredient", classes:"red"});
			return;
		}

		this.ingarr.push(ingobj);

		this.addlists(ingobj);

		// pass on any needed info to the recipes
		this.ftool.recipes.recalcCosts(ingobj.name);
		this.doSave();
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
				this.doSave();
				return;
			}
		}

		// pass on any needed info to the recipes
		this.ftool.recipes.recalcCosts(ingname);
	}

	get(ingname) {
		ingname = ingname.trim().toLowerCase();
		for (let i=0; i<this.ingarr.length; i++) {
			if (this.ingarr[i].name.toLowerCase() === ingname) {
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

		let that = this;
		this.ingarr.forEach(function(ingobj) {
			that.addlists(ingobj);
		});
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

