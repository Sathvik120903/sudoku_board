import pytest

from app import app, CURRENT
import sudoku_logic


def test_create_empty_board_returns_9x9_empty_grid():
    board = sudoku_logic.create_empty_board()
    assert len(board) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in board)
    assert all(cell == sudoku_logic.EMPTY for row in board for cell in row)


def test_is_safe_detects_row_col_and_box_conflicts():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 5
    board[0][4] = 7
    board[4][0] = 3
    assert not sudoku_logic.is_safe(board, 0, 1, 5)
    assert not sudoku_logic.is_safe(board, 1, 0, 5)
    assert not sudoku_logic.is_safe(board, 1, 1, 5)
    assert sudoku_logic.is_safe(board, 8, 8, 1)


def test_fill_board_generates_valid_complete_solution():
    board = sudoku_logic.create_empty_board()
    assert sudoku_logic.fill_board(board) is True
    assert all(cell != sudoku_logic.EMPTY for row in board for cell in row)

    expected_digits = set(range(1, sudoku_logic.SIZE + 1))
    for row in board:
        assert set(row) == expected_digits

    for col_index in range(sudoku_logic.SIZE):
        col_values = {board[row_index][col_index] for row_index in range(sudoku_logic.SIZE)}
        assert col_values == expected_digits

    for box_row in range(0, sudoku_logic.SIZE, 3):
        for box_col in range(0, sudoku_logic.SIZE, 3):
            box_values = {
                board[r][c]
                for r in range(box_row, box_row + 3)
                for c in range(box_col, box_col + 3)
            }
            assert box_values == expected_digits


def test_generate_puzzle_returns_puzzle_and_solution_with_empty_cells():
    clues = 35
    puzzle, solution = sudoku_logic.generate_puzzle(clues=clues)

    assert len(puzzle) == sudoku_logic.SIZE
    assert len(solution) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert all(len(row) == sudoku_logic.SIZE for row in solution)

    empty_cells = sum(cell == sudoku_logic.EMPTY for row in puzzle for cell in row)
    assert empty_cells == sudoku_logic.SIZE * sudoku_logic.SIZE - clues

    for r in range(sudoku_logic.SIZE):
        for c in range(sudoku_logic.SIZE):
            if puzzle[r][c] != sudoku_logic.EMPTY:
                assert puzzle[r][c] == solution[r][c]

    assert all(cell != sudoku_logic.EMPTY for row in solution for cell in row)
    assert sudoku_logic.has_unique_solution(puzzle)


def test_flask_check_solution_endpoint_detects_incorrect_entries():
    correct_solution = [[(r * 3 + r // 3 + c) % sudoku_logic.SIZE + 1 for c in range(sudoku_logic.SIZE)] for r in range(sudoku_logic.SIZE)]
    CURRENT['solution'] = correct_solution

    board = [row[:] for row in correct_solution]
    board[0][0] = (board[0][0] % sudoku_logic.SIZE) + 1

    with app.test_client() as client:
        response = client.post('/check', json={'board': board})
        assert response.status_code == 200
        payload = response.get_json()
        assert 'incorrect' in payload
        assert payload['incorrect'] == [[0, 0]]


def test_flask_check_solution_endpoint_requires_active_game():
    CURRENT['solution'] = None
    with app.test_client() as client:
        response = client.post('/check', json={'board': sudoku_logic.create_empty_board()})
        assert response.status_code == 400
        payload = response.get_json()
        assert payload['error'] == 'No game in progress'
