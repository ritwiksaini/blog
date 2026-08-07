export function DataMesh({ className }: { className?: string }) {
  const nodes = [
    [4, 18],
    [34, 6],
    [62, 22],
    [90, 10],
    [116, 26],
    [20, 40],
    [76, 42],
  ]
  const edges: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [1, 5],
    [2, 6],
    [4, 6],
  ]

  return (
    <svg
      viewBox="0 0 120 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={0.6}
        />
      ))}
      {nodes.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === 3 ? 2.4 : 1.4}
          fill="currentColor"
          fillOpacity={i === 3 ? 0.9 : 0.5}
        />
      ))}
    </svg>
  )
}
