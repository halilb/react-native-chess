import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../components';

export default class HomeScreen extends Component {
  static navigationOptions = {
    title: 'Chess',
  };
  render() {
    return (
      <View style={styles.container}>
        <Button text={'Training'} onPress={() => {}} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
});
