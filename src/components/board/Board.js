import React, { Component, PropTypes } from 'react';
import { View, StyleSheet } from 'react-native';

import { Chess } from 'chess.js';

import Square from './Square';
import Piece from './Piece';

const DIMENSION = 8;
const COLUMN_NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default class BoardView extends Component {
  static propTypes = {
    fen: PropTypes.string,
    size: PropTypes.number.isRequired,
    showNotation: PropTypes.bool,
    color: PropTypes.oneOf(['w', 'b']),
    shouldSelectPiece: PropTypes.func,
    onMove: PropTypes.func,
    style: View.propTypes.style,
  };

  static defaultProps = {
    showNotation: true,
    color: 'w',
    shouldSelectPiece: () => true,
    onMove: () => {},
  };

  constructor(props) {
    super(props);

    const game = new Chess(props.fen);

    this.state = {
      game,
      board: this.createBoardData(game, props.fen),
    };
  }

  componentWillReceiveProps(nextProps) {
    const nextFen = nextProps.fen;
    if (nextFen !== this.props.fen) {
      this.setState({
        board: this.createBoardData(this.state.game, nextFen),
      });
    }
  }

  movePiece = (to, from) => {
    const { onMove } = this.props;
    const { game, board } = this.state;
    const selectedPiece = board.find(item => item.selected);
    const moveConfig = {
      to,
      from: from || selectedPiece.position,
    };

    game.move(moveConfig);
    onMove(moveConfig);

    this.setState({
      board: this.createBoardData(game),
    });
  };

  undo = () => {
    const { game } = this.state;
    game.undo();
    this.setState({
      board: this.createBoardData(game),
    });
  };

  selectPiece = position => {
    const { shouldSelectPiece } = this.props;
    const { board, game } = this.state;
    const piece = board.find(b => b.position === position);

    // remove the piece
    if (piece.canMoveHere) {
      this.movePiece(position);
      return;
    }

    // do nothing if piece shouldn't be selected
    if (!shouldSelectPiece(piece)) {
      return;
    }

    const possibleMoves = game
      .moves({
        square: piece.position,
        verbose: true,
      })
      .map(item => item.to);

    const newBoard = board.map(square => {
      // unselect everything
      if (piece.selected) {
        return {
          ...square,
          selected: false,
          canMoveHere: false,
        };
      }

      const isSelected = square.position === position;
      const canMoveHere = possibleMoves.indexOf(square.position) > -1;

      return {
        ...square,
        selected: isSelected,
        canMoveHere,
      };
    });

    this.setState({
      board: newBoard,
    });
  };

  createBoardData(game, newFen) {
    if (newFen) {
      game.load(newFen);
    }

    const board = game.board();
    const squares = [];
    const history = game.history({ verbose: true });
    const lastMove = history[history.length - 1] || {};
    const inCheck = game.in_check();
    const turn = game.turn();

    board.forEach((row, rowIndex) => {
      row.forEach((square, columnIndex) => {
        const columnName = COLUMN_NAMES[columnIndex];
        const position = `${columnName}${DIMENSION - rowIndex}`;
        const type = square ? square.type : '';
        const color = square ? square.color : '';

        squares.push({
          ...square,
          position,
          columnName,
          rowIndex,
          columnIndex,
          selected: false,
          canMoveHere: false,
          lastMove: position === lastMove.to || position === lastMove.from,
          inCheck: inCheck && turn === color && type === game.KING,
        });
      });
    });

    return squares;
  }

  renderSquares(reverseBoard) {
    const { size, showNotation } = this.props;
    const { board } = this.state;
    const squareSize = size / DIMENSION;
    const rowSquares = [];

    board.forEach(square => {
      const {
        rowIndex,
        columnIndex,
        columnName,
        position,
        selected,
        canMoveHere,
        lastMove,
        inCheck,
      } = square;

      const squareView = (
        <Square
          key={`square_${rowIndex}_${columnIndex}`}
          size={squareSize}
          showNotation={showNotation}
          rowIndex={rowIndex}
          columnIndex={columnIndex}
          columnName={columnName}
          dimension={DIMENSION}
          selected={selected}
          canMoveHere={canMoveHere}
          position={position}
          lastMove={lastMove}
          inCheck={inCheck}
          reverseBoard={reverseBoard}
          onSelected={this.movePiece}
        />
      );

      if (!rowSquares[rowIndex]) {
        rowSquares[rowIndex] = [];
      }
      rowSquares[rowIndex].push(squareView);
    });

    return rowSquares.map((r, index) => {
      return (
        <View key={`row_${index}`} style={styles.row}>
          {r}
        </View>
      );
    });
  }

  renderPieces(reverseBoard) {
    const { size } = this.props;
    const { board } = this.state;

    return board.map(square => {
      const {
        type,
        color,
        rowIndex,
        columnIndex,
        position,
      } = square;
      if (type) {
        return (
          <Piece
            key={`piece_${rowIndex}_${columnIndex}`}
            type={type}
            color={color}
            rowIndex={rowIndex}
            columnIndex={columnIndex}
            pieceSize={size / DIMENSION}
            position={position}
            reverseBoard={reverseBoard}
            onSelected={this.selectPiece}
          />
        );
      }
      return null;
    });
  }

  render() {
    const { color, style } = this.props;
    const reverseBoard = color === 'b';

    return (
      <View style={[styles.container, style]}>
        <View
          style={{
            transform: [
              {
                rotate: reverseBoard ? '180deg' : '0deg',
              },
            ],
          }}
        >
          {this.renderSquares(reverseBoard)}
          {this.renderPieces(reverseBoard)}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
});
