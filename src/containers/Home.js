import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../components';

export default class HomeScreen extends Component {
  static navigationOptions = {
    title: 'Home',
  };

  render() {
    const { navigate } = this.props.navigation;

    return (
      <View style={styles.container}>
        <Button text={'Training'} onPress={() => navigate('Training')} />
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
