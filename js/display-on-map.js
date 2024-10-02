"use strict";

import 'https://unpkg.com/maplibre-gl/dist/maplibre-gl.js';
import 'https://unpkg.com/maplibre-gl/dist/maplibre-gl.css' with { type: 'css' };  // Chrome 123 or later
import * as turf from 'https://cdn.jsdelivr.net/npm/@turf/turf@7/+esm';
import key from "../key.json" with {type: "json"};
// const KEY_MAPTILER = 'YOUR_MAPTILER_API_KEY_HERE';

const source_name = "graph";
const styles = ["darkmatter", "positron", "basic", "bright", "openstreetmap", "satellite"];
const colors = {"point": "#e040e0", "oneway": "#90c0f0", "undirected": "#80d070"};

const map = new maplibregl.Map({
  container: 'map',
  style: getStyle(styles[0]),
  center: [60, 0],
  zoom: 0,
});

map.addControl(new maplibregl.NavigationControl());
map.addControl(new maplibregl.ScaleControl({maxWidth: 90, unit: 'metric'}));

const onLoad = execution => map.on("load", execution);

// styles of map
const selectStyle = document.getElementById("select"); 
selectStyle.addEventListener('change', swapStyle, false);
for (const style of styles) {
  const el = document.createElement("option");
  el.textContent = style;
  el.value = getStyle(style);
  selectStyle.appendChild(el);
};

function getStyle(style) {
  return `https://api.maptiler.com/maps/${style}/style.json?key=${key.maptiler}`;
}

function swapStyle() {
	map.setStyle(selectStyle.value,
    {
      transformStyle: (previousStyle, nextStyle) => {
        const custom_layers = previousStyle.layers.filter((layer) => {
          if (layer.source) {return layer.source.startsWith(source_name);}
        });
        const layers = nextStyle.layers.concat(custom_layers);
        const sources = nextStyle.sources;
        for (const [key, value] of Object.entries(previousStyle.sources)) {
          if (key.startsWith(source_name)) {sources[key] = value;}
        }
        return {...nextStyle, sources: sources, layers: layers};
      }
    });
}


// methods -----------------------------
Array.prototype.extract = function(key) {return this.filter(w => w[key] != false)};


const displayGraph = graph => {
  const source = {"points": `${source_name}_points`, "lines": `${source_name}_lines`};
  const data = {
    "points": {"type": "FeatureCollection", "features": graph.vertices.extract("inGraph")},
    "lines": {"type": "FeatureCollection", "features": graph.edges.extract("inGraph")},
  };

  map.fitBounds(turf.bbox(data.lines), {padding: 30});

  // sources
  map.addSource(source.points, {
    type: "geojson",
    data: data.points
  });

  map.addSource(source.lines, {
    type: "geojson",
    data: data.lines
  });

  map.addLayer({
    "id": `${source.lines}_undirected`,
    "source": source.lines,
    "type": "line",
    "paint": {
      "line-color": colors["undirected"],
    },
    "filter":  ["!=", "yes", ["get", "oneway", ["get", "tags"]]],
  });

  map.addLayer({
    "id": `${source.lines}_oneway`,
    "source": source.lines,
    "type": "line",
    "paint": {
      "line-color": colors["oneway"],
    },
    "filter":  ["==", "yes", ["get", "oneway", ["get", "tags"]]],
  });

  map.addLayer({
    "id": source.points,
    "source": source.points,
    "type": "circle",
    "paint": {
      "circle-color": colors["point"],
      "circle-radius": 2
    },
  });
};

export {onLoad, displayGraph};
