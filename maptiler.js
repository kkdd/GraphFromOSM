
const KEY_MAPTILER = 'gRH9lMBOcae1wkylfAhY';
// const KEY_MAPTILER = 'YOUR_MAPTILER_API_KEY_HERE';

const map = new maplibregl.Map({
	container: 'map',
	style: `https://api.maptiler.com/maps/positron/style.json?key=${KEY_MAPTILER}`,
	center: [60, 0],
	zoom: 0,
});

map.addControl(new maplibregl.NavigationControl());
map.addControl(new maplibregl.ScaleControl({maxWidth: 90, unit: 'metric'}));

export {map};
