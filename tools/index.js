//set up by default for objects to be compared if they are empty
var Tools = function(){
	
}
//check if object is empty
Tools.prototype.isEmpty = function(OBJ) {
	for (var key in OBJ) {
		if (OBJ.hasOwnProperty(key)) return false;
	}
	return true;
};

//merge obj2(src) values into obj1(dest) 
Tools.prototype.mergeProp = function(obj1, obj2) { //obj1 is destination, obj2 is source
  for (var a in obj2) {
      obj1[a] = obj2[a];  
  }
  return obj1 //returns {a: 1, b: 4, c: 3, d: 4} should have {...b: 2...}
}

module.exports = Tools;