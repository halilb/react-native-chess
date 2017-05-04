import React from 'react';
import { AppRegistry, Text } from 'react-native';
import { StackNavigator } from 'react-navigation';

import Home from './containers/Home';

const Chess = StackNavigator({
  Home: { screen: Home },
});

AppRegistry.registerComponent('Chess', () => Chess);
