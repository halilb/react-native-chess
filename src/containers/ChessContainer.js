import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';

import { Chess } from 'chess.js';

import ChessBoard from '../components/board';

export default class PlayerVsRandom extends Component {
  constructor(props) {
    super(props);

    this.state = {
      game: new Chess(),
      userColor: 'b',
    };
  }

  componentDidMount() {
    setTimeout(this.makeRandomMove, 500);
  }

  onMove = ({ from, to }) => {
    const { game, userColor } = this.state;
    game.move({
      from,
      to,
      promotion: game.QUEEN,
    });

    if (game.turn() !== userColor) {
      setTimeout(this.makeRandomMove, 500);
    }
  };

  shouldSelectPiece = piece => {
    const { game, userColor } = this.state;
    const turn = game.turn();
    if (
      game.in_checkmate() === true ||
      game.in_draw() === true ||
      turn !== userColor ||
      piece.color !== userColor
    ) {
      return false;
    }
    return true;
  };

  makeRandomMove = () => {
    const { game } = this.state;
    const possibleMoves = game.moves({ verbose: true });

    // exit if the game is over
    if (
      game.game_over() === true ||
      game.in_draw() === true ||
      possibleMoves.length === 0
    ) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    const randomMove = possibleMoves[randomIndex];
    game.move(randomMove);
    this.board.movePiece(randomMove.to, randomMove.from);
  };

  render() {
    const { fen, userColor } = this.state;

    return (
      <View style={styles.container}>
        <ChessBoard
          ref={board => this.board = board}
          fen={fen}
          color={userColor}
          size={340}
          shouldSelectPiece={this.shouldSelectPiece}
          onMove={this.onMove}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#EEEEEE',
  },
});
