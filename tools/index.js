//set up by default for objects to be compared if they are empty
var Tools = function(){
	
}

Tools.prototype.isEmpty = function(OBJ) {
	for (var key in OBJ) {
		if (OBJ.hasOwnProperty(key)) return false;
	}
	return true;
};

module.exports = Tools;