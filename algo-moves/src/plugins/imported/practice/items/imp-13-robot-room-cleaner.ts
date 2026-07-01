import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Robot Room Cleaner explores an unknown grid without a map. Which algorithm category best describes the approach?",
      "choices": [
        {
          "label": "DFS with backtracking using relative coordinates",
          "correct": true
        },
        {
          "label": "BFS with an explicit queue tracking absolute coordinates"
        },
        {
          "label": "Dijkstra's algorithm to find shortest cleaning path"
        },
        {
          "label": "Union-Find to track connected clean regions"
        }
      ],
      "explain": "The code uses recursive DFS (`btCleanRoom`) and marks visited cells in a `vis` map keyed by relative (r, c) offsets from the start. After each recursive call it backtracks the robot to its previous position — a classic backtracking pattern. BFS would need an explicit queue and doesn't naturally handle the robot's physical orientation."
    },
    {
      "id": "visited-key",
      "prompt": "The `vis` map uses `[2]int{r, c}` as keys. What do `r` and `c` represent here?",
      "choices": [
        {
          "label": "Relative offsets from the robot's starting position",
          "correct": true
        },
        {
          "label": "Absolute grid coordinates returned by the Robot API"
        },
        {
          "label": "Row and column indices of the room's bounding box"
        },
        {
          "label": "The robot's current orientation encoded as angles"
        }
      ],
      "explain": "The Robot API gives no knowledge of absolute position. The code tracks position by accumulating the direction deltas from (0,0), so r and c are relative displacements. This is why you can still detect previously-visited cells despite having no map."
    },
    {
      "id": "backtrack-mechanic",
      "prompt": "After a recursive call to `btCleanRoom` returns, the code calls `TurnRight, TurnRight, Move, TurnRight, TurnRight`. What is the purpose of this sequence?",
      "choices": [
        {
          "label": "Return the robot to the cell it came from, facing the same direction as before",
          "correct": true
        },
        {
          "label": "Rotate the robot to face the next of the four directions to try"
        },
        {
          "label": "Undo the last Clean() so the cell can be re-cleaned later"
        },
        {
          "label": "Signal the Robot API that DFS recursion has ended"
        }
      ],
      "explain": "Two right turns reverse the robot's direction (180°), Move steps back one cell, then two more right turns restore the original facing. This physically backtracks the robot so the parent call can continue trying other directions from the correct position."
    },
    {
      "id": "direction-cycling",
      "prompt": "Inside the loop `for i := 0; i < 4; i++`, the code computes `nd := (d + i) % 4`. What does `d` represent and why is modulo 4 used?",
      "choices": [
        {
          "label": "d is the current facing direction (0–3); modulo 4 wraps around the four cardinal directions",
          "correct": true
        },
        {
          "label": "d is the depth of recursion; modulo 4 limits cleaning to four passes"
        },
        {
          "label": "d is the number of dirty cells remaining; modulo 4 selects the nearest one"
        },
        {
          "label": "d is an absolute compass heading in degrees divided by 90"
        }
      ],
      "explain": "The `dirs` array encodes four directions at indices 0–3. `d` is the direction the robot currently faces, and `(d + i) % 4` cycles through all four relative to that facing. Without the modulo the index would go out of bounds."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `cleanRoom`?",
      "choices": [
        {
          "label": "Time O(cells), Space O(cells)",
          "correct": true
        },
        {
          "label": "Time O(cells²), Space O(cells)"
        },
        {
          "label": "Time O(cells log cells), Space O(1)"
        },
        {
          "label": "Time O(4^depth), Space O(depth)"
        }
      ],
      "explain": "Each reachable cell is visited at most once (the `vis` check prevents re-entry), and the DFS call stack plus the visited map are both proportional to the number of reachable cells."
    },
    {
      "id": "edge-move-fail",
      "prompt": "The condition `!vis[[2]int{nr, nc}] && robot.Move()` checks both before attempting to recurse. What happens when `robot.Move()` returns false?",
      "choices": [
        {
          "label": "The cell is a wall; we skip the recursive call and just rotate to the next direction",
          "correct": true
        },
        {
          "label": "The robot backtracks two cells instead of one to avoid the obstacle"
        },
        {
          "label": "The cell is marked visited anyway so it is never tried again"
        },
        {
          "label": "The algorithm terminates early, assuming the room is fully cleaned"
        }
      ],
      "explain": "A false return from Move() means the robot hit a wall and did not move. The code skips the recursive call and the backtrack sequence (since no move was made) and falls through to the final `TurnRight()` to try the next direction. The wall cell is intentionally NOT added to `vis` because there is no relative coordinate to record for an unmovable cell."
    }
  ]
};
