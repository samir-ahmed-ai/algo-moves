/**
 * "The Archipelago of Reach" — the narrative world layered over the Graphs course.
 *
 * Every graph problem is a chapter of one voyage: each technique cluster is a
 * REGION of the same sea, and each problem is a landmark charted within it, so a
 * learner remembers a technique by remembering which waters they sailed through.
 *
 * This is an OVERLAY, resolved by problem id — the generated manifest.ts stays the
 * source for the Go solutions; this file adds story framing, region membership and
 * the additional language ports. The factory (factory.tsx) injects the ports as
 * extra code tabs; the SQL exporter (scripts/export-content-sql.mts) seeds the
 * regions + per-problem narrative into story_regions / problems.
 */

import { GENERATED_STORY, GENERATED_PORTS } from './archipelagoData.generated';

export interface StoryRegion {
  id: string;
  courseId: string;
  codeName: string;
  title: string;
  subtitle: string;
  blurb: string;
  order: number;
}

export interface ProblemStory {
  regionId: string;
  chapter: string;
  narrative: string;
}

export interface ProblemPorts {
  python?: string;
  java?: string;
}

const C = 'graphs';

/** The eleven regions of the archipelago, in voyage order. */
export const ARCHIPELAGO_REGIONS: StoryRegion[] = [
  {
    id: 'archipelago-ripple-shallows', courseId: C, order: 1,
    codeName: 'Region 1', title: 'The Ripple Shallows', subtitle: 'BFS · unweighted paths & reachability',
    blurb: 'Calm shallow water where a dropped stone sends rings outward, one ring per second. That expanding ring IS breadth-first search by levels — the nearest islets light up first.',
  },
  {
    id: 'archipelago-fog-banks', courseId: C, order: 2,
    codeName: 'Region 2', title: 'The Fog Banks', subtitle: 'BFS · grids & state-spaces',
    blurb: 'A gridded sea of fog where you see only one tile ahead, so you must expand ring by ring, blind — even when the "tiles" are word-states or board positions rather than places.',
  },
  {
    id: 'archipelago-deep-trenches', courseId: C, order: 3,
    codeName: 'Region 3', title: 'The Deep Trenches', subtitle: 'DFS · dive, clone, enumerate, backtrack',
    blurb: 'Vertical cave-tunnels where you plunge all the way down one branch before surfacing — memoising, snapshotting and backtracking as you go.',
  },
  {
    id: 'archipelago-tide-flats', courseId: C, order: 4,
    codeName: 'Region 4', title: 'The Tide Flats', subtitle: 'Flood fill · grid connectivity',
    blurb: 'At low tide, land and water blur into one muddy plain. Wade onto a patch of land and flood it with dye to claim the whole connected island at once.',
  },
  {
    id: 'archipelago-mount-prerequisite', courseId: C, order: 5,
    codeName: 'Region 5', title: 'Mount Prerequisite', subtitle: 'Topological sort',
    blurb: 'A terraced volcano where you may lay a step only once every step beneath it is set — dependency order made physical.',
  },
  {
    id: 'archipelago-whirlpool-watch', courseId: C, order: 6,
    codeName: 'Region 6', title: 'The Whirlpool Watch', subtitle: 'Cycle detection',
    blurb: 'A lookout tower that spots currents looping back on themselves — a rope crossing an already-marked buoy, or a channel still spinning on your stack.',
  },
  {
    id: 'archipelago-coral-colonies', courseId: C, order: 7,
    codeName: 'Region 7', title: 'The Coral Colonies', subtitle: 'Union-Find · disjoint sets',
    blurb: 'Living reefs that fuse into ever-larger super-reefs; each reef knows only its elder polyp (the root). Merging is union; asking "same reef?" is find.',
  },
  {
    id: 'archipelago-lighthouse-straits', courseId: C, order: 8,
    codeName: 'Region 8', title: 'The Lighthouse Straits', subtitle: 'Weighted shortest paths',
    blurb: 'Channels with real distances and currents, where a greedy pilot always sails to the nearest unvisited lit buoy — Dijkstra at the helm, Floyd charting every hub.',
  },
  {
    id: 'archipelago-two-tone-atoll', courseId: C, order: 9,
    codeName: 'Region 9', title: 'The Two-Tone Atoll', subtitle: 'Bipartite coloring',
    blurb: 'A ring reef you try to paint in exactly two alternating hues; two touching same-coloured isles break the two-tone spell.',
  },
  {
    id: 'archipelago-fragile-bridges', courseId: C, order: 10,
    codeName: 'Region 10', title: 'The Fragile Bridges', subtitle: 'Bridges · Tarjan',
    blurb: 'Rope bridges where cutting the wrong one severs the archipelago; a surveyor times each island to find the links nothing can loop around.',
  },
  {
    id: 'archipelago-harbormasters-ledger', courseId: C, order: 11,
    codeName: 'Region 11', title: "The Harbormaster's Ledger", subtitle: 'Degree & greedy edge analysis',
    blurb: 'A dockside office tallying how many ferries touch each port, and squeezing the highest-value routes out of the busiest berths.',
  },
];

// ---- Language ports (differentially verified against the Go reference) ----

const PY_SHORTEST_REACH = `from collections import deque


def bfs(n, edges, start):
    if start < 1 or start > n:
        return [-1] * (n - 1)
    adj = [[] for _ in range(n + 1)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    dist = [-1] * (n + 1)
    dist[start] = 0
    q = deque([start])
    while q:
        cur = q.popleft()
        for nb in adj[cur]:
            if dist[nb] == -1:
                dist[nb] = dist[cur] + 6
                q.append(nb)
    return [dist[i] for i in range(1, n + 1) if i != start]
`;

const JAVA_SHORTEST_REACH = `import java.util.*;

class Solution {
    int[] bfs(int n, int[][] edges, int start) {
        if (start < 1 || start > n) {
            int[] res = new int[n - 1];
            Arrays.fill(res, -1);
            return res;
        }
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        int[] dist = new int[n + 1];
        Arrays.fill(dist, -1);
        dist[start] = 0;
        Deque<Integer> q = new ArrayDeque<>();
        q.add(start);
        while (!q.isEmpty()) {
            int cur = q.poll();
            for (int nb : adj.get(cur)) {
                if (dist[nb] == -1) {
                    dist[nb] = dist[cur] + 6;
                    q.add(nb);
                }
            }
        }
        int[] res = new int[n - 1];
        int k = 0;
        for (int i = 1; i <= n; i++) {
            if (i != start) res[k++] = dist[i];
        }
        return res;
    }
}
`;

const PY_SHORTEST_PATH = `from collections import deque


def find_shortest_path_with_bfs(adj, src, dest):
    n = len(adj)
    dist = [-1] * n
    pred = [-1] * n
    q = deque([src])
    dist[src] = 0
    while q:
        v = q.popleft()
        if v == dest:
            break
        for nb in adj[v]:
            if dist[nb] == -1:
                dist[nb] = dist[v] + 1
                pred[nb] = v
                q.append(nb)
    if dist[dest] == -1:
        return None
    path = []
    at = dest
    while at != -1:
        path.insert(0, at)
        at = pred[at]
    return path
`;

const JAVA_SHORTEST_PATH = `import java.util.*;

class Solution {
    int[] findShortestPathWithBfs(int[][] adj, int src, int dest) {
        int n = adj.length;
        int[] dist = new int[n];
        int[] pred = new int[n];
        Arrays.fill(dist, -1);
        Arrays.fill(pred, -1);
        Deque<Integer> q = new ArrayDeque<>();
        q.add(src);
        dist[src] = 0;
        while (!q.isEmpty()) {
            int v = q.poll();
            if (v == dest) break;
            for (int nb : adj[v]) {
                if (dist[nb] == -1) {
                    dist[nb] = dist[v] + 1;
                    pred[nb] = v;
                    q.add(nb);
                }
            }
        }
        if (dist[dest] == -1) return null;
        LinkedList<Integer> path = new LinkedList<>();
        for (int at = dest; at != -1; at = pred[at]) path.addFirst(at);
        int[] out = new int[path.size()];
        for (int i = 0; i < out.length; i++) out[i] = path.get(i);
        return out;
    }
}
`;

const PY_TRAVERSAL = `from collections import deque


class GraphNode:
    def __init__(self, label):
        self.label = label
        self.neighbors = []


def graph_traversal_dfs(src):
    visited = set()
    order = []

    def dfs(node):
        if node is None or id(node) in visited:
            return
        visited.add(id(node))
        order.append(node.label)
        for nb in node.neighbors:
            dfs(nb)

    dfs(src)
    return order


def graph_traversal_bfs(src):
    if src is None:
        return []
    visited = {id(src)}
    q = deque([src])
    order = []
    while q:
        v = q.popleft()
        order.append(v.label)
        for nb in v.neighbors:
            if id(nb) not in visited:
                visited.add(id(nb))
                q.append(nb)
    return order
`;

const JAVA_TRAVERSAL = `import java.util.*;

class Solution {
    static class GraphNode {
        int label;
        List<GraphNode> neighbors = new ArrayList<>();
        GraphNode(int label) { this.label = label; }
    }

    List<Integer> graphTraversalDFS(GraphNode src) {
        List<Integer> order = new ArrayList<>();
        dfs(src, Collections.newSetFromMap(new IdentityHashMap<>()), order);
        return order;
    }

    private void dfs(GraphNode n, Set<GraphNode> visited, List<Integer> order) {
        if (n == null || visited.contains(n)) return;
        visited.add(n);
        order.add(n.label);
        for (GraphNode nb : n.neighbors) dfs(nb, visited, order);
    }

    List<Integer> graphTraversalBFS(GraphNode src) {
        List<Integer> order = new ArrayList<>();
        if (src == null) return order;
        Set<GraphNode> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        visited.add(src);
        Deque<GraphNode> q = new ArrayDeque<>();
        q.add(src);
        while (!q.isEmpty()) {
            GraphNode v = q.poll();
            order.add(v.label);
            for (GraphNode nb : v.neighbors) {
                if (!visited.contains(nb)) {
                    visited.add(nb);
                    q.add(nb);
                }
            }
        }
        return order;
    }
}
`;

const PY_HAS_PATH = `from collections import deque


def has_path(adj, src, dest):
    if src == dest:
        return True
    visited = [False] * len(adj)
    q = deque([src])
    visited[src] = True
    while q:
        v = q.popleft()
        for nb in adj[v]:
            if nb == dest:
                return True
            if not visited[nb]:
                visited[nb] = True
                q.append(nb)
    return False
`;

const JAVA_HAS_PATH = `import java.util.*;

class Solution {
    boolean hasPath(int[][] adj, int src, int dest) {
        if (src == dest) return true;
        boolean[] visited = new boolean[adj.length];
        Deque<Integer> q = new ArrayDeque<>();
        q.add(src);
        visited[src] = true;
        while (!q.isEmpty()) {
            int v = q.poll();
            for (int nb : adj[v]) {
                if (nb == dest) return true;
                if (!visited[nb]) {
                    visited[nb] = true;
                    q.add(nb);
                }
            }
        }
        return false;
    }
}
`;

/** Region 1 story framing (hand-authored pilot). */
const RIPPLE_SHALLOWS_STORY: Record<string, ProblemStory> = {
  'imp-0-01-bfs-shortest-reach': {
    regionId: 'archipelago-ripple-shallows',
    chapter: 'Charting the Shallows',
    narrative:
      'You drop a single stone off the source islet and count the rings it takes to lap every other islet — each ring is worth 6 fathoms of open water. Islets no ring ever reaches stay dark on the chart at −1. That patient, level-by-level spread is breadth-first search: the shallows hand you the true unweighted distance to everything at once.',
  },
  'imp-0-03-find-shortest-path-with-bfs': {
    regionId: 'archipelago-ripple-shallows',
    chapter: 'The Breadcrumb Buoys',
    narrative:
      'Measuring the distance is not enough — you want the route home. So the moment a ripple first touches an islet you nail a breadcrumb buoy there, pointing back at whichever islet the ring came from (its predecessor). When the rings finally lap the destination dock, you walk the buoys backward and the shortest path draws itself.',
  },
  'imp-0-04-graph-traversal': {
    regionId: 'archipelago-ripple-shallows',
    chapter: 'Two Boats, One Logbook',
    narrative:
      'Two crews chart the same waters. A diver plunges island to island, all the way down one chain before surfacing (depth-first). A signal-tower fans its rings out evenly, nearest islets first (breadth-first). Both crews share one logbook of visited islets, so no island is ever charted twice — the same map, two rhythms of exploring it.',
  },
  'imp-0-05-has-path-from-source-to-destination': {
    regionId: 'archipelago-ripple-shallows',
    chapter: 'Does the Ripple Reach the Dock?',
    narrative:
      'The simplest question in the Shallows: can you even get there? Drop the stone at the source and let the rings spread, marking each islet so you never revisit it. The instant a ring laps the destination dock you stop and answer yes; if the water goes still first, no route exists.',
  },
};

/** Region 1 verified ports (hand-authored pilot). */
const RIPPLE_SHALLOWS_PORTS: Record<string, ProblemPorts> = {
  'imp-0-01-bfs-shortest-reach': { python: PY_SHORTEST_REACH, java: JAVA_SHORTEST_REACH },
  'imp-0-03-find-shortest-path-with-bfs': { python: PY_SHORTEST_PATH, java: JAVA_SHORTEST_PATH },
  'imp-0-04-graph-traversal': { python: PY_TRAVERSAL, java: JAVA_TRAVERSAL },
  'imp-0-05-has-path-from-source-to-destination': { python: PY_HAS_PATH, java: JAVA_HAS_PATH },
};

/** All per-problem story framing: Region 1 (hand-authored) + generated Regions 2–11. */
export const PROBLEM_STORY: Record<string, ProblemStory> = { ...RIPPLE_SHALLOWS_STORY, ...GENERATED_STORY };

/** All verified language ports: Region 1 (hand-authored) + generated Regions 2–11. */
export const PROBLEM_PORTS: Record<string, ProblemPorts> = { ...RIPPLE_SHALLOWS_PORTS, ...GENERATED_PORTS };
