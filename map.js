
//import {KEY_MAPTILER} from './key/maptiler.js'
import {KEY_MAPTILER} from './key.js';
import keyJson from "./key.json";
console.log(keyJson);
//const KEY_MAPTILER = keyJson["maptilerKey"];

// const KEY_MAPTILER = 'YOUR_MAPTILER_API_KEY_HERE';
//console.log(key, key.KEY_MAPTILER);
//console.log(KEY_MAPTILER);

const map = new maplibregl.Map({
	container: 'map',
	style: `https://api.maptiler.com/maps/positron/style.json?key=${KEY_MAPTILER}`,
	center: [60, 0],
	zoom: 0,
});

map.addControl(new maplibregl.NavigationControl());
map.addControl(new maplibregl.ScaleControl({maxWidth: 90, unit: 'metric'}));


const addFeatures = (source, features) => {
	const geojson = {"type": "FeatureCollection", "features": features};
	map.fitBounds(turf.bbox(geojson), {padding: 20});

	map.addSource(source, {
		type: "geojson",
		data: geojson
	});

	map.addLayer({
		"id": `${source}_line`,
		"source": "osm_sample",
		"type": "line",
		"paint": {
		"line-color": "#a0d0d0",
		},
		"filter":  ["!=", "yes", ["get", "oneway", ["get", "tags"]]],
	});

	map.addLayer({
		"id": `${source}_line_oneway`,
		"source": "osm_sample",
		"type": "line",
		"paint": {
		"line-color": "#e0a0e0",
		},
		"filter":  ["==", "yes", ["get", "oneway", ["get", "tags"]]],
	});

	map.addLayer({
		"id": `${source}_point`,
		"source": "osm_sample",
		"type": "circle",
		"paint": {
			"circle-color": "#0000ff",
			"circle-radius": 1.5
		},
		"filter": ["==", "Point", ["geometry-type"]],
	});
};


export {map, addFeatures};
