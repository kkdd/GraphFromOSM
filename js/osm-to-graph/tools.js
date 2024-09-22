"use strict";
/*
--------------------------------------------------------------------------------
Here we define several functions that will be used in OsmToGraph function to
convert OSM raw data into geojson graph.
--------------------------------------------------------------------------------
*/

const copyNodes = new Map();  // nodes stored in Map()

const [REVERSE, BIDIRECTIONAL, ONEWAY] = [-1, 0, 1];
const wayDirected = oneway => {
  switch (oneway) {
    case '-1':
    case 'reverse':
      return REVERSE;
    case undefined:
    case '0':
    case 'no':
    case 'false':
    case 'reversible':
      return BIDIRECTIONAL;
    default:
      return ONEWAY;
  }
}

// -----------------------------------------------------------------------------
/*
Decompose each OSM way-type objects into potentially multiple links
  EXAMPLE: (the * are the raod intersections)
  Initial OSM way object        *------*----------*-------*------*
                          ==>
  Decomposition in 4 links      *------* + *----------* + *-------* + *------*
*/


const decomposeWaysToEdges = (ways, copyNodes) => {
  const edges = [];
  let edgeID = 0;  // sequential
  ways.forEach(way => {  
    // 1) First node of the way processing -------------------------------------
    let i = 0;
    let node = way.nodes[i];  // first node
    let nodesSlice = [node];
    copyNodes.get(node).edgeIDs.push(edgeID);
  
    // 2) Middle nodes of the way processing -----------------------------------
    for (; ++i < way.nodes.length - 1;) {
      node = way.nodes[i];  // middle node
      nodesSlice.push(node);
      if(copyNodes.get(node).linksCount > 1) {
        copyNodes.get(node).edgeIDs.push(edgeID);
        edges.push(makeEdge(way, nodesSlice));
        edgeID++;  // reinitialize slice
        nodesSlice = [node];
        copyNodes.get(node).edgeIDs.push(edgeID);
      }
    }
  
    // 3) Last node of the way processing -------------------------------------
    node = way.nodes[i];  // last node
    nodesSlice.push(node);
    copyNodes.get(node).edgeIDs.push(edgeID);
    edges.push(makeEdge(way, nodesSlice));
    edgeID++;
  })

  return edges;


  function makeEdge(way, nodes) {
    let directed = wayDirected(way.tags.oneway);
    if (directed == REVERSE) {
      directed = ONEWAY;
      nodes.reverse();
    }
    const edge = {
      osmID: way.id,
      tags: way.tags,
      vertices: [nodes[0], nodes.at(-1)],  // [id_source, id_target]
      nodes: nodes,  // osmID's
      directed: directed
    }
    if (edge.tags.oneway == 'reversible') {edge.tags.reversible = true;}
    edge.tags.oneway = (directed == ONEWAY) ? 'yes' : 'no';
    return edge;
  }
}


// -----------------------------------------------------------------------------
// Transforms a node OSM element to a geojson "Point" feature ------------------
const nodeToFeature = (node) => {
  return {
    type: 'Feature',
    edges: node.edgeIDs,
    inGraph: true,
    geometry: {
      type: 'Point',
      coordinates: node.coordinates
    },
    properties: {
      osmId: node.osmId,
      tags: node.tags || {}
    }
   }
}


// -----------------------------------------------------------------------------
// Transforms a way OSM element to a geojson "LineString" feature -------------------
const edgeToFeature = (edge) => {
  return {
    type: 'Feature',
    vertices: edge.vertices,
    directed: edge.directed,
    inGraph: true,
    geometry: {
      type: 'LineString',
      coordinates: edge.nodes.map(node => copyNodes.get(node).coordinates)
    },
    properties: {
      osmId: edge.id,
      tags: edge.tags || {}
    }
  }
}


// -----------------------------------------------------------------------------
// Assign unique ids to each point and linestring objects
const assignIds = (nodes, edges) => {
  const osmIdToId = new Map();      // send OSM id (that are no more uniques for edges) to a new generated unique id
  // Update Nodes
  nodes.forEach( (node, i) => {
    node.id = i;
    osmIdToId.set(node.properties.osmId, node.id);
  })

  // Update edges
  edges.forEach( (edge, i) => {
    edge.id = i;
    edge.vertices = edge.vertices.map(v => osmIdToId.get(v));
  })
}


export {decomposeWaysToEdges, nodeToFeature, edgeToFeature, assignIds, copyNodes};
