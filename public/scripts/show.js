//used to get map to load in show page for campground
var LIBRARY =
	LIBRARY ||
	(function() {
		var campground = {};

		return {
			init: function(args) {
				campground = args;
			},
			initMap: function() {
				var lat = campground.lat;
				var lng = campground.lng;
				var center = { lat: lat, lng: lng };
				var map = new google.maps.Map(document.getElementById('map'), {
					zoom: 8,
					center: center,
					scrollwheel: false
				});
				var contentString = `
      			<strong>${campground.title}<br>
      			${campground.location}</strong>
      			<p>${campground.description}</p>`;
				var infowindow = new google.maps.InfoWindow({
					content: contentString
				});
				var marker = new google.maps.Marker({
					position: center,
					map: map
				});
				marker.addListener('click', function() {
					infowindow.open(map, marker);
				});
			}
		};
	}());