"use strict";
import {getOsmData} from './get-osm/get-osm-data.js';
import {osmDataToGraph} from './osm-to-graph/osm-data-to-graph.js';


const PLURAL = {node: 'nodes', way: 'ways', vertex: 'vertices', edge: 'edges'};

const generateGraph = async (settings) => {
  const osmData = await getOsmData(settings);   // Import OSM raw data

  for (const type of ['node', 'way']) {
    osmData[PLURAL[type]] = osmData.elements.filter(e => e.type === type);
  }
  delete osmData.elements;
  console.log(`The imported OSM data contains ${osmData.nodes.length} nodes and ${osmData.ways.length} ways.`);

  const graph = osmDataToGraph(osmData);         // Here is your graph
//  console.log(`Your graph contains ${graph.vertices.length} vertices and ${graph.edges.length} edges.`);
  return graph;
}

export {generateGraph};
