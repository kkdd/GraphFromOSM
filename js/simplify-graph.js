"use strict";

// methods -----------------------------
Array.prototype.bothAreEqual = function() {return this[0] === this[1]};
Map.prototype.getArray = function(key) {
  if (!this.has(key)) this.set(key, []);
  return this.get(key);
};


function simplifyGraph(graph) {
  // 1) Choose normal degree-2 vertices in the graph
  const vertices_degree_2 = new Map();  // store degree-2 vertices
  for (const vertex of graph.vertices) {
    if (!vertex.inGraph) continue;
    const edgeIDs = vertex.edges.filter(id => graph.edges[id].inGraph);
    if (edgeIDs.length != 2) continue;  // It isn't a degree-2 vertex.
    if (edgeIDs.bothAreEqual()) continue;  // It's an isolated loop.
    const edges = edgeIDs.map(id => graph.edges[id]);  // depicted as [ --- * --- ]
    const directed = edges.map(e => e.directed);
    if (!directed.bothAreEqual()) continue;  // A mixture of directed and undirected.
    if (directed[0]) {  // for a directed edge
      const dirsOut = edges.map(d => d.vertices[0] == vertex.id);  // outward directions
      if (dirsOut.bothAreEqual()) continue;  // will not concatenated; depicted as [ <-- * --> ] or [ --> * <-- ].
      if (dirsOut[0]) edgeIDs.reverse();  // make it in the processing order depicted as [ --> * --> ]
    }
    const adjacents = edgeIDs.map(edgeID => graph.edges[edgeID].vertices.find(v => v != vertex.id));  // = [predecessor, successor] for directed
    vertices_degree_2.set(vertex.id, {
      visited: false,
      directed: directed[0],
      edgeIDs: edgeIDs,
      adjacents: adjacents
    });
  }

  // 2) Make concatenated edges by propagating on degree-2 vertices and introduce them into the graph. We however leave isolated cycle graphs untouched.
  const [PREDECESSOR, SUCCESSOR] = [0, 1];  // adjacents = [predecessor, successor]
  for (let id of vertices_degree_2.keys()) {
    if (visited(id)) continue;
    let [predecessor, successor] = getAdjacents(id);
    if (vertices_degree_2.has(predecessor)) continue;  // Ascertain whether it is the first vertex for processing
    const edgeIDs = [getEdge(id, PREDECESSOR)];
    while (true) {
      edgeIDs.push(getEdge(id, SUCCESSOR));
      if (!vertices_degree_2.has(successor)) break;
      [predecessor, id] = [id, successor];
      const adjacents = vertices_degree_2.get(id).adjacents;
      if (adjacents[0] == predecessor)
        successor = adjacents[1];
      else {  // reverse to make it in the processing order
        successor = adjacents[0];
        vertices_degree_2.get(id).edgeIDs.reverse();
      }
    }
    introduceEdgeConcatenated(edgeIDs);  // Append a new edge into the graph.
  }

  // 3) Reasign adjacency data.
  const verticesToEdges = setVerticesToEdges(graph);
  graph.vertices.forEach(vertex => {
    if (!vertex.inGraph) return;  // continue
    vertex.edges = verticesToEdges.get(vertex.id);  // reasign
  });


  // functions -----------------------------
  function visited(vertexID) {
    return vertices_degree_2.get(vertexID).visited;
  }

  function getAdjacents(vertexID) {
    const v = vertices_degree_2.get(vertexID);
    if (!v.directed && vertices_degree_2.has(v.adjacents[0]) && !vertices_degree_2.has(v.adjacents[1])) {  // undirected
      v.edgeIDs.reverse();
      v.adjacents.reverse();
    }
    return v.adjacents;
  }

  function getEdge(vertexID, index) {  //  index = PREDECESSOR or SUCCESSOR
    const vertex = vertices_degree_2.get(vertexID);
    const edgeID = vertex.edgeIDs[index];
    const edge = graph.edges[edgeID];
    if (edge.vertices[0] != (index==PREDECESSOR?vertex.adjacents[0]:vertexID)) {
      edge.vertices.reverse();
      edge.geometry.coordinates.reverse();
    }
    vertices_degree_2.get(vertexID).visited = true;
    graph.vertices[vertexID].inGraph = false;  // eliminate degree-2 vertices no longer in use in the graph
    return edgeID;
  }

  function coordinatesConcatenated(edges) {
    const coordsBunch = edges.map(e => e.geometry.coordinates);
    const coords = [coordsBunch[0][0]];
    coordsBunch.forEach(b => coords.push(...b.slice(1)));  // concatenation
    return coords;
  }

  function introduceEdgeConcatenated(edgeIDs) {
    const edges = edgeIDs.map(id => graph.edges[id]);
    const edgeConcatenated = {...edges[0]};  // new edge
    edgeConcatenated.id = graph.edges.length;  // sequential ID
    edgeConcatenated.inGraph = true;
    edgeConcatenated.vertices[1] = edges.at(-1).vertices[1];
    edgeConcatenated.geometry = {type: 'LineString', coordinates: coordinatesConcatenated(edges)};
    graph.edges.push(edgeConcatenated);  // append
    edges.forEach(e => e.inGraph = false);  // eliminate edges no longer in use in the graph
  }

  function setVerticesToEdges(graph) {
    const verticesToEdges = new Map();
    graph.edges.forEach(edge => {
      if (!edge.inGraph) return;  // continue
      edge.vertices.forEach(v => verticesToEdges.getArray(v).push(edge.id))
    });
    return verticesToEdges;
  }
}

// Obtain connected componnents in graph
function extractConnectedWith(graph, highway) {
  const edgesVisited = new Set();  // store edgeID's during traverse
  const extractHighway = edge => edge.inGraph && edge.properties.tags.highway == highway;
  graph.edges.filter(extractHighway).forEach(traverse);  // traverse
  extractVisited(graph);

  // functions -----------------------------
  function traverse(edgeParent) {  // depth-first search
    if (!edgesVisited.has(edgeParent.id)) {
      edgesVisited.add(edgeParent.id);
      edgesConnected(edgeParent).forEach(edge => traverse(edge));  // recursion
    }
  }

  function extractVisited(graph) {
    const visited = new Set();  // store vertexID's
    graph.edges.forEach(edge => {
      if (!edgesVisited.has(edge.id)) {edge.inGraph = false;}
      else {edge.vertices.forEach(v => visited.add(v));}
    });
    graph.vertices.forEach(vertex => {
      if (!visited.has(vertex.id)) {vertex.inGraph = false;}
    });
  }

  function edgesConnected(edge) {
    const edgeIDs = new Set();
    edge.vertices.forEach(v => {
      graph.vertices[v].edges.forEach(e => edgeIDs.add(e));
    })
    return [...edgeIDs].map(id => graph.edges[id]);
  }
}

export {simplifyGraph, extractConnectedWith};
