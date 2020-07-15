# React Bingo

React Bingo is a bingo game display board written with the [React Javascript Library](https://github.com/facebook/react) and [Express](https://expressjs.com/).

![Screenshot](doc/capture-control.png "React Bingo (control mode)")

It has the following features:

- Controller mode optimized for touchscreen use (landscape display)
- View mode for displaying on a large TV or projector or share screen on a video conference
- Automatic card validation
- Multiple prize/patterns: it is possible to continue the game after a bingo was called if one wants to award one prize per pattern.

## Requirements

- A bingo game set (cards, something to pick numbers)
- Firefox, Chrome or Safari browser, may run on other browsers
- Docker compose (file version: v3)
- Node.js (`npm`) in order to build the frontend

## Usage

### Controller mode

Draw numbers and click or tap on them in the board.
Once a player calls a bingo, click on the "Bingo" button.
Input the card number, the card will show and the valid numbers will be in green.
Alternatively, in the case of a manual validation, tap on the completed pattern(s).

Controls allow to undo/redo the last action and reset the game.

### Switching to view mode

Use the bottom left eye icon in order to switch to view mode.

![Screenshot](doc/capture-view.png "React Bingo (view mode)")

Enable full screen mode (F11).

## Preparation (optional)

### Cards

Cards can be edited in the `backend/cards.csv` file, `id` is the number of the card and the columns correspond to the following positions:

|  B  |  I  |  N  |  G  |  O  |
|:---:|:---:|:---:|:---:|:---:|
| b1  | i1  | n1  | g1  | o1  |
| b2  | i2  | n2  | g2  | o2  |
| b3  | i3  |  *  | g3  | o3  |
| b4  | i4  | n4  | g4  | o4  |
| b5  | i5  | n5  | g5  | o5  |


### Patterns

Patterns can be added if necessary in the `backend/src/validation.ts` file (at the beginning).
A corresponding graphic should be added in the frontend in the `frontend/src/patterns` directory. Create one from the `frontend/base_fig.svg` file using [Inkscape](https://inkscape.org/) and save it as a Simple SVG.  Then, reference it in `frontend/src/patterns/index.js`.

Finally, edit the `backend/src/server.ts` file in order to tell the frontend what are the valid patterns for the game.

```typescript
//Edit types here!
//Array of Arrays of strings: each array is displayed on a different line (max 2 lines)
app.get('/types', async (req, res) => {
  //return res.status(200).json([['b', 'i', 'n', 'g', 'o'], ['row', 'diag', 'corners', 'x', 'full']]);
  return res.status(200).json([['row', 'column', 'diag', 'corners']]);
  //return res.status(200).json([['full']]);
});
```

## Installation

```bash
# Build frontend
cd frontend
npm install
npm run build
cd ..

# Build backend and launch
docker-compose build
docker-compose up -d
```

The server now runs on port 3000 (http://localhost:3000). If the server is restarted, refresh any open session.
