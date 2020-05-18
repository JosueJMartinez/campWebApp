
$('.validate').click(function(){
	
	if(!$(".forms-validating").valid()){
		console.log('test');
		return false;
	}	
});