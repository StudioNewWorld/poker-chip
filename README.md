# Poker Chip Physics Board

An interactive poker chip distribution board that uses Matter.js physics to simulate chips tumbling into player areas, the pot, and the bank. Configure per-player chip stacks, tweak the number of players at the table, and run quick resets to visualize stack allocations for home games or tournaments.

## Features
- Responsive control panel for managing up to 16 players with add/remove buttons.
- Real-time stack calculation that scales chip counts based on a configurable per-player total.
- Physics-driven chip movement powered by Matter.js with mouse drag-and-drop support.
- Automatic area counters that keep track of chips and points for each player area and the bank.
- Visual legend describing chip denominations and player color assignments.

## Getting Started
This project is entirely client-side. You only need a browser that supports modern JavaScript.

1. Clone or download this repository.
2. Open `index.html` in your browser, or serve the directory with a simple static server such as:

   ```bash
   npx serve .
   ```

3. Use the on-page controls to set the number of players and the desired chip stack value, then press **セットアップ** to generate the board.

## Usage Notes
- **Player Count Controls:** Increment or decrement the number of active seats; the layout resizes automatically.
- **Stack Configuration:** Enter the total chip value per player. The app scales a base template to generate denomination counts.
- **Legend & Summary:** Review the legend for color/denomination mapping and the player summary cards for the allocated stacks.
- **Interaction:** Drag chips with the mouse to move them between player areas, the pot, and the bank. Use **リセット** to rebuild the original layout.

## Customization
- Adjust chip denominations, colors, and default stack templates in `app.js` by modifying the `DENOMINATIONS`, `BASE_STACK_TEMPLATE`, and `BANK_STACK_TEMPLATE` objects.
- Tweak physical layout constants such as `BOARD_WIDTH`, `BOARD_HEIGHT`, and `PLAYER_RING_RADIUS` to reflow the board.
- Update the UI styling within the `<style>` block in `index.html` to match your preferred theme.

## Technology
- Vanilla HTML/CSS/JavaScript
- [Matter.js](https://brm.io/matter-js/) for rigid-body physics and interactions

