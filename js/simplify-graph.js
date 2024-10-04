"use strict";

// methods -----------------------------
Array.prototype.bothAreEqual = function() {return this[0] === this[1]};
Map.prototype.getArray = function(key) {
  if (!this.has(key)) this.set(key, []);
  return this.get(key);
};

// graph simplification by deleteing degree-2 vertices
function simplifyGraph(graph) {  // graph will be overwritten
  // 1) Choose and store normal degree-2 vertices in the graph
  const vertices_degree_2 = new Map();  // initialization
  for (const vertex of graph.vertices) {
    if (!shouldBeConcatenated(vertex)) continue;
    const edgeIDs = vertex.edges;  // edge ids for the first and second ones
    const edges = edgeIDs.map(id => graph.edges[id]);
    const directed = edges[0].directed;  // == edges[1].directed
    const adjacents = edges.map(e => e.vertices.find(id => id != vertex.id));  // depicted as [ * --- v --- * ] where v denotes the vertex and *'s the adjacents.
    vertices_degree_2.set(vertex.id, {
      visited: false,
      directed: directed,
      edgeIDs: edgeIDs,
      adjacents: adjacents
    });
  }

  // 2) Make concatenated edges by propagating at degree-2 vertices and introduce them into the graph. We however leave isolated cycle graphs untouched.
  for (let id of vertices_degree_2.keys()) {
    let successor = getSuccessor(id);
    if (!successor) continue;  // The vertex should not be used as a beginning.
    const edgeIDs = [getEdgeAhead(id)];  // initialization
    while (true) {
      edgeIDs.push(getEdgeBehind(id));
      if (!vertices_degree_2.has(successor)) break;
      [id, successor] = moveAStepForward(id, successor);  // update to propagate
    }
    introduceEdgeConcatenated(edgeIDs);  // Append a new edge into the graph.
  }

  // 3) Reassign adjacency data.
  const verticesToEdges = getReassignmentVerticesToEdges(graph);
  graph.vertices.forEach(vertex => {
    if (vertex.inGraph) {vertex.edges = verticesToEdges.get(vertex.id);}  // reassign
  });


  // functions -----------------------------
  function shouldBeConcatenated(vertex) {
    if (!vertex.inGraph) return false;
    const edgeIDs = vertex.edges.filter(id => graph.edges[id].inGraph);
    if (edgeIDs.length != 2) return false;  // It isn't a degree-2 vertex.
    if (edgeIDs.bothAreEqual()) return false;  // It's an isolated loop as the first and second edges are identical.
    const edges = edgeIDs.map(id => graph.edges[id]);  // depicted as [ --- v --- ]
    const directed = edges.map(e => e.directed);
    if (!directed.bothAreEqual()) return false;  // A mixture of directed and undirected.
    if (directed[0]) {  // for a directed edge
      const dirsOut = edges.map(e => e.vertices[0] == vertex.id);  // outward directions
      if (dirsOut.bothAreEqual()) return false;  // will not concatenated; depicted as [ <-- v --> ] or [ --> v <-- ].
      if (edges[0].vertices[0] == vertex.id) vertex.edges.reverse(); // make them in the processing order depicted as [ p --> v --> s ] where p and s denote the predecessor and successor.
    }
    return true;
  }

  function visited(vertexID) {
    return vertices_degree_2.get(vertexID).visited;
  }

  function getSuccessor(vertexID) {
    if (visited(vertexID)) {return undefined};
    const vertex = vertices_degree_2.get(vertexID);
    let [predecessor, successor] = vertex.adjacents;
    if (!vertex.directed && vertices_degree_2.has(predecessor) && !vertices_degree_2.has(successor)) {  // undirected
      vertex.edgeIDs.reverse();
      vertex.adjacents.reverse();
      successor = predecessor;
    } else if (vertices_degree_2.has(predecessor)) {successor = undefined;}  // Ascertain whether the vertex should be used as a beginning.
    return successor;
  }

  function moveAStepForward(id, successor) {  // update [id, successor] to move a step forward to propagate
    const predecessor = id;
    id = successor;
    const vertex = vertices_degree_2.get(id);
    const adjacents = vertex.adjacents;  // = [predecessor, successor] if in its standard order
    if (adjacents[0] == predecessor)
      successor = adjacents[1];
    else {  // reverse to make it in the processing order
      successor = adjacents[0];
      vertex.edgeIDs.reverse();
    }
    return [id, successor];
  }

  function getEdgeAhead(vertexID) {return getEdge(vertexID, 0);}
  function getEdgeBehind(vertexID) {
    vertices_degree_2.get(vertexID).visited = true;
    graph.vertices[vertexID].inGraph = false;  // eliminate degree-2 vertices no longer in use in the graph
    return getEdge(vertexID, 1);
  }
  function getEdge(vertexID, index) {  // index = 0 (ahead) or 1 (behind)
    const vertex = vertices_degree_2.get(vertexID);
    const edgeID = vertex.edgeIDs[index];
    const edge = graph.edges[edgeID];
    if (edge.vertices[index ^ 1] != vertexID) {  // The edge is in reverse order in the graph.
      edge.vertices.reverse();
      edge.geometry.coordinates.reverse();
    }
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

  function getReassignmentVerticesToEdges(graph) {
    const verticesToEdges = new Map();  // initialization
    graph.edges.forEach(edge => {
      if (!edge.inGraph) return;  // continue
      edge.vertices.forEach(v => verticesToEdges.getArray(v).push(edge.id))
    });
    return verticesToEdges;
  }
}

// Obtain connected componnents in graph
function extractConnectedWith(graph, highway) {  // graph will be overwritten
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
    const edgeIDs = new Set();  // initialization
    edge.vertices.forEach(v => {
      graph.vertices[v].edges.forEach(e => edgeIDs.add(e));
    })
    return [...edgeIDs].map(id => graph.edges[id]);
  }
}

export {simplifyGraph, extractConnectedWith};
