
$('.validate').click(function(){
	
	if(!$("#registerForm").valid()){
		console.log('test');
		return false;
	}	
});