# Rogue Canvas Dungeon

A lightweight, dependency-free roguelike dungeon crawler built with **HTML5 Canvas + vanilla JavaScript**.

## Run locally

Because the game uses ES modules, run it from a local web server:

```bash
# from the repo root
python3 -m http.server 8000
```

Then open: http://localhost:8000

## Controls

- Move: **WASD / Arrow keys**
- Wait: **Space**
- Use potion: **P**
- Skill: **F** (unlocks as you level)
- Descend stairs: **Enter** (when standing on `>`)
- Save & quit: in the pause menu

Mobile: use the on-screen D-pad/buttons.

## Save / Load

The game auto-saves to `localStorage`. Use **Continue** from the menu to resume.
