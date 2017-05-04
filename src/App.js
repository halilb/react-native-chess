import React from 'react';
import { AppRegistry, Text } from 'react-native';
import { StackNavigator } from 'react-navigation';

import Home from './containers/Home';
import Training from './containers/Training';

const Chess = StackNavigator(
  {
    Home: { screen: Home },
    Training: {
      screen: Training,
    },
  },
  {
    mode: 'modal',
  },
);

AppRegistry.registerComponent('Chess', () => Chess);
