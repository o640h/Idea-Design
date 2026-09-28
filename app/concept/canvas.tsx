"use client";

import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback } from "react";

const initialNodes: Node[] = [
  { id: "goal", position: { x: 0, y: 0 }, data: { label: "Goal" } },
  {
    id: "mechanism",
    position: { x: 260, y: 120 },
    data: { label: "Mechanism" },
  },
];

const initialEdges: Edge[] = [
  { id: "goal-mechanism", source: "goal", target: "mechanism" },
];

export default function ConceptCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((currentEdges) => addEdge(connection, currentEdges)),
    [setEdges],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
