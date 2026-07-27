import copy
import random

SIZE = 9
EMPTY = 0


def deep_copy(board):
    return copy.deepcopy(board)


def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True


def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def find_empty_cell(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                return row, col
    return None, None


def count_solutions(board, limit=2):
    row, col = find_empty_cell(board)
    if row is None:
        return 1

    solutions = 0
    for num in range(1, SIZE + 1):
        if is_safe(board, row, col, num):
            board[row][col] = num
            solutions += count_solutions(board, limit)
            board[row][col] = EMPTY
            if solutions >= limit:
                return solutions
    return solutions


def has_unique_solution(board):
    return count_solutions(deep_copy(board), limit=2) == 1


def remove_cells(board, clues):
    attempts = SIZE * SIZE - clues
    while attempts > 0:
        row = random.randrange(SIZE)
        col = random.randrange(SIZE)
        if board[row][col] != EMPTY:
            board[row][col] = EMPTY
            attempts -= 1


def generate_puzzle(clues=35, max_attempts=200):
    if clues < 17:
        raise ValueError('A uniquely solvable Sudoku puzzle requires at least 17 clues')

    for attempt in range(max_attempts):
        board = create_empty_board()
        fill_board(board)
        solution = deep_copy(board)
        puzzle = deep_copy(solution)
        remove_cells(puzzle, clues)

        if has_unique_solution(puzzle):
            return puzzle, solution

    raise RuntimeError('Unable to generate a uniquely solvable puzzle after several attempts')
