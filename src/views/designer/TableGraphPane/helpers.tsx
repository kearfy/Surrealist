import { TableNode } from "~/views/designer/TableGraphPane/nodes/TableNode";
import { EdgeNode } from "./nodes/EdgeNode";
import { DesignerNodeMode, TableDefinition } from "~/types";
import { extractEdgeRecords } from "~/util/schema";
import { Edge, Node, Position } from "reactflow";
import dagere from "dagre";

type HeightMap = Record<DesignerNodeMode, (t: TableDefinition) => number>;

export const NODE_TYPES = {
	table: TableNode,
	edge: EdgeNode,
};

const HEIGHTS: HeightMap = {
	fields: (t) => 56 + t.fields.length * 34,
	summary: () => 125,
	simple: () => 24,
};

interface NormalizedTable {
	isEdge: boolean;
	table: TableDefinition;
	from: string[];
	to: string[];
}

export function normalizeTables(tables: TableDefinition[]): NormalizedTable[] {
	return tables.map((table) => {
		const [isEdge, from, to] = extractEdgeRecords(table);

		return {
			isEdge,
			table,
			to,
			from,
		};
	});
}

export function buildTableGraph(
	tables: TableDefinition[],
	active: TableDefinition | null,
	nodeMode: DesignerNodeMode
): [Node[], Edge[]] {
	const items = normalizeTables(tables);
	const graph = new dagere.graphlib.Graph();
	const edges: Edge[] = [];
	const nodes: Node[] = [];

	// Configure layout
	graph.setDefaultEdgeLabel(() => ({}));
	graph.setGraph({ rankdir: "LR" });

	// Define all tables as nodes
	for (const { table, isEdge } of items) {
		const height = HEIGHTS[nodeMode](table);

		nodes.push({
			id: table.schema.name,
			type: isEdge ? "edge" : "table",
			position: { x: 0, y: 0 },
			sourcePosition: Position.Right,
			targetPosition: Position.Left,
			data: {
				table,
				isSelected: active?.schema.name == table.schema.name,
				hasLeftEdge: false,
				hasRightEdge: false,
				nodeMode
			},
		});

		graph.setNode(table.schema.name, {
			width: 310,
			height,
		});
	}

	const edgeItems = items.filter((item) => item.isEdge);

	// Define all edges
	for (const { table, from, to } of edgeItems) {
		for (const fromTable of from) {
			edges.push({
				id: table.schema.name + fromTable,
				source: fromTable,
				target: table.schema.name,
			});

			graph.setEdge(fromTable, table.schema.name);

			const node = nodes.find((node) => node.id == fromTable);

			if (node) {
				node.data.hasRightEdge = true;
			}
		}

		for (const toTable of to) {
			edges.push({
				id: table.schema.name + toTable,
				source: table.schema.name,
				target: toTable,
				focusable: false,
			});

			graph.setEdge(table.schema.name, toTable);

			const node = nodes.find((node) => node.id == toTable);

			if (node) {
				node.data.hasLeftEdge = true;
			}
		}
	}

	// Apply layout
	dagere.layout(graph);

	// Shift nodes to the top left
	for (const node of nodes) {
		const nodeWithPosition = graph.node(node.id);

		node.position = {
			x: 50 + nodeWithPosition.x - nodeWithPosition.width / 2,
			y: 50 + nodeWithPosition.y - nodeWithPosition.height / 2,
		};
	}

	return [nodes, edges];
}
