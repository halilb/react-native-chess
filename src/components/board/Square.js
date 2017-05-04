import React, { Component, PropTypes } from 'react';
import { Text, View, StyleSheet, TouchableWithoutFeedback } from 'react-native';

export default class Board extends Component {
  static propTypes = {
    size: PropTypes.number.isRequired,
    showNotation: PropTypes.bool,
    rowIndex: PropTypes.number.isRequired,
    position: PropTypes.string.isRequired,
    columnName: PropTypes.string.isRequired,
    columnIndex: PropTypes.number.isRequired,
    dimension: PropTypes.number.isRequired,
    selected: PropTypes.bool,
    canMoveHere: PropTypes.bool,
    lastMove: PropTypes.bool,
    inCheck: PropTypes.bool,
    reverseBoard: PropTypes.bool,
    onSelected: PropTypes.func.isRequired,
  };

  onSelected = () => {
    const { position, onSelected } = this.props;
    onSelected(position);
  };

  renderNotations(isBlack) {
    const {
      showNotation,
      rowIndex,
      columnIndex,
      columnName,
      dimension,
      reverseBoard,
    } = this.props;
    const notations = [];
    const transform = [
      {
        rotate: reverseBoard ? '180deg' : '0deg',
      },
    ];

    if (showNotation) {
      if (columnIndex + 1 === dimension) {
        notations.push(
          <Text
            key={'row_notations'}
            style={[
              styles.notation,
              {
                color: isBlack ? '#B58863' : '#F0D9B5',
                top: 0,
                right: 0,
                transform,
              },
            ]}
          >
            {dimension - rowIndex}
          </Text>,
        );
      }

      if (rowIndex + 1 === dimension) {
        notations.push(
          <Text
            key={'column_notation'}
            style={[
              styles.notation,
              {
                color: isBlack ? '#B58863' : '#F0D9B5',
                bottom: 0,
                left: 0,
                transform,
              },
            ]}
          >
            {columnName}
          </Text>,
        );
      }
    }

    return notations;
  }

  renderMoveIndicator() {
    const { canMoveHere } = this.props;

    if (canMoveHere) {
      return <View style={styles.moveIndicator} />;
    }
    return null;
  }

  render() {
    const {
      size,
      rowIndex,
      columnIndex,
      selected,
      lastMove,
      inCheck,
      canMoveHere,
    } = this.props;
    const isBlack = (rowIndex + columnIndex) % 2 === 0;
    let backgroundColor = isBlack ? '#F0D9B5' : '#B58863';

    if (selected) {
      backgroundColor = '#656E41';
    } else if (lastMove) {
      backgroundColor = '#CDD26B';
    } else if (inCheck) {
      backgroundColor = '#C51B16';
    }

    return (
      <TouchableWithoutFeedback
        onPress={this.onSelected}
        disabled={!canMoveHere}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor,
              width: size,
              height: size,
            },
          ]}
        >
          {this.renderMoveIndicator()}
          {this.renderNotations(isBlack)}
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notation: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: 'bold',
  },
  moveIndicator: {
    width: 24,
    height: 24,
    opacity: 0.3,
    backgroundColor: '#208530',
    borderRadius: 12,
  },
});
