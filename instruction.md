# Sudoku Project Context for GitHub Copilot

## Project Overview
I am refactoring a legacy Python Sudoku game into a modern, fully functional web application. 

## Tech Stack
*   **Backend:** Python, Flask
*   **Frontend:** HTML, CSS (flexible on plain CSS, modules, or a lightweight framework)
*   **Storage:** Browser Local Storage (for scores)

## Core Game Logic Requirements
*   The board must generate puzzles with exactly ONE unique solvable solution.
*   Implement three difficulty levels (Easy, Medium, Hard) that determine the number of prefilled cells.
*   Prefilled cells must be strictly locked and uneditable by the user.
*   The game must validate inputs and provide immediate visual feedback for invalid moves (e.g., highlighting conflicting cells).
*   Display a congratulatory message when the puzzle is correctly completed.

## Interactive Features
*   **Check Button:** Highlights any incorrect entries currently on the board.
*   **Hint Button:** Fills in one valid, empty cell with the correct number and locks it.
*   **Timer:** Tracks how long the player takes to solve the puzzle.
*   **Top 10 Scoreboard:** Saves player names, times, and difficulty levels in Local Storage so it persists between sessions.
*   **Dark Mode:** A toggle that updates the entire UI between light and dark modes.

## Styling Guidelines
*   The layout must scale smoothly between desktop and mobile views.
*   The 3x3 Sudoku sub-grids must alternate in color for visual clarity, with no visible layout shifts.
*   Text and controls must remain highly readable in both light and dark modes.

## Copilot Guidelines
*   Generate modular, reusable components.
*   Include comments explaining complex logic.
*   Ensure consistent error handling.
*   If I ask you to write tests, prefer standard Python testing frameworks like `unittest` or `pytest`.