type State = string;

interface Edge {
  from: State;
  to: State;
  throwHeight: number;
}

interface Graph {
  states: State[];
  edges: Edge[];
}

function generateStates(numBalls: number, maxHeight: number): State[] {
  const states: State[] = [];

  function backtrack(pos: number, ballsLeft: number, current: string) {
    const remaining = maxHeight - pos;
    if (ballsLeft > remaining) return;
    if (pos === maxHeight) {
      if (ballsLeft === 0) states.push(current);
      return;
    }
    backtrack(pos + 1, ballsLeft, current + "0");
    if (ballsLeft > 0) {
      backtrack(pos + 1, ballsLeft - 1, current + "x");
    }
  }

  backtrack(0, numBalls, "");
  return states;
}

function getTransitions(state: State): Edge[] {
  const edges: Edge[] = [];
  const rightmost = state[state.length - 1];
  const shifted = "0" + state.slice(0, -1);

  if (rightmost === "0") {
    edges.push({ from: state, to: shifted, throwHeight: 0 });
  } else {
    for (let i = 0; i < shifted.length; i++) {
      if (shifted[i] === "0") {
        const newState = shifted.slice(0, i) + "x" + shifted.slice(i + 1);
        const throwHeight = shifted.length - i;
        edges.push({ from: state, to: newState, throwHeight });
      }
    }
  }

  return edges;
}

function generateGraph(numBalls: number, maxHeight: number): Graph {
  const states = generateStates(numBalls, maxHeight);
  const edges = states.flatMap(getTransitions);
  return { states, edges };
}

function printGraph(graph: Graph): void {
  for (const state of graph.states) {
    const outgoing = graph.edges.filter((e) => e.from === state);
    const edgeStrs = outgoing
      .map((e) => `${e.to} (${e.throwHeight})`)
      .join(", ");
    console.log(`${state} -> ${edgeStrs}`);
  }
}

function generateHtml(graph: Graph, groundState: string): string {
  const elements = [
    ...graph.states.map((s) => ({
      data: { id: s, label: s, ground: s === groundState },
    })),
    ...graph.edges.map((e, i) => ({
      data: {
        id: `e${i}`,
        source: e.from,
        target: e.to,
        label: String(e.throwHeight),
      },
    })),
  ];

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Siteswap State Graph</title>
<script src="https://unpkg.com/cytoscape@3/dist/cytoscape.min.js"></script>
<style>
  body { margin: 0; overflow: hidden; }
  #cy { width: 100vw; height: 100vh; }
</style>
</head>
<body>
<div id="cy"></div>
<script>
cytoscape({
  container: document.getElementById('cy'),
  elements: ${JSON.stringify(elements)},
  style: [
    {
      selector: 'node',
      style: {
        'background-color': '#4a90d9',
        'label': 'data(label)',
        'color': '#fff',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-family': 'monospace',
        'font-size': '12px',
        'width': 60,
        'height': 60,
      }
    },
    {
      selector: 'node[?ground]',
      style: {
        'background-color': '#e8b62c',
        'border-width': 3,
        'border-color': '#c49a1e',
        'width': 75,
        'height': 75,
      }
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate',
        'line-color': '#999',
        'target-arrow-color': '#999',
      }
    },
    {
      selector: 'edge[source = target]',
      style: {
        'curve-style': 'loop',
      }
    }
  ],
  layout: {
    name: 'cose',
    animate: false,
    nodeRepulsion: () => 8000,
    gravity: 0.3,
    idealEdgeLength: () => 120,
  }
});
</script>
</body>
</html>`;
}

function openInBrowser(filePath: string) {
  const cmd = process.platform === "darwin" ? "open" : "xdg-open";
  Bun.spawn([cmd, filePath]);
}

const main = async () => {
  const numBalls = parseInt(process.argv[2]);
  const maxHeight = parseInt(process.argv[3]);

  if (isNaN(numBalls) || isNaN(maxHeight)) {
    console.error("Usage: bun run index.ts <numBalls> <maxHeight>");
    process.exit(1);
  }

  const graph = generateGraph(numBalls, maxHeight);
  printGraph(graph);

  const groundState = "0".repeat(maxHeight - numBalls) + "x".repeat(numBalls);
  const html = generateHtml(graph, groundState);
  const outputPath = `${import.meta.dir}/graph.html`;
  await Bun.write(outputPath, html);
  openInBrowser(outputPath);
};

await main();
