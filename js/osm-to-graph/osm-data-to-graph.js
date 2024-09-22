"use strict";
import {decomposeWaysToEdges, nodeToFeature, edgeToFeature, assignIds, copyNodes} from './tools.js';

/*
--------------------------------------------------------------------------------
A functrion that transforms raw OSM data into a geojson format.
Moreover, it restructurate the nodes and ways element in such a
way that they now are forming a graph.
The main point is to separate a way object each time there is a road intersection.
--------------------------------------------------------------------------------
*/

const osmDataToGraph = (osmData) => {
  const graph = {
    metaData: {
      source: 'https://overpass-api.de/api/interpreter',
      version: osmData.version,
      generator: osmData.generator,
      osm3s: osmData.osm3s,
      generationgCodeAuthor: 'Matsvei Tsishyn'
    }
  };

  // 1) Initialize some new properties and separate in nodes and ways ----------
  osmData.nodes.forEach(n => {
  const copyNode = {
    osmId: n.id,
    coordinates: [n.lon, n.lat],
    linksCount: 0,    //  count how may OSM ways pass trough this node
    edgeIDs: [],    // store IDs during decomposition
    tags: {...n.tags}
   };
   copyNodes.set(copyNode.osmId, copyNode);
  });


  // 2) Update the linksCount of nodes --------------------------------------
  osmData.ways.forEach(way => {
  way.nodes.forEach(node => {
    copyNodes.get(node).linksCount++;
  })
  })

  // 3) Decompose way elements in links and transform them into geojson feature in graph. ----------------------------------------
  graph.edges = decomposeWaysToEdges(osmData.ways, copyNodes).map(edgeToFeature);

  // 4) Transform OSM nodes into geojson feature and make a graph
  graph.vertices = [...copyNodes.values()].filter(n => n.edgeIDs.length).map(nodeToFeature);
  assignIds(graph.vertices, graph.edges);

  return graph;
}

export {osmDataToGraph};
