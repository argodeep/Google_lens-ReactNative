import React from 'react';
import { Text, View, Alert, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import * as Permissions from 'expo-permissions';
import { Camera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { decode as atob, encode as btoa } from 'base-64';
import * as AWS from 'aws-sdk';
import credential from './config';

export default class CameraExample extends React.Component {
  camera: any;
  state = {
    hasCameraPermission: null,
    type: Camera.Constants.Type.back,
    loading: false,
    response: []
  };

  async componentDidMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasCameraPermission: status === 'granted' });
  }

  takePicture = async () => {
    if (this.camera) {
      this.camera.takePictureAsync().then(
        res => {
          this.onProcess(res.uri);
          this.setState({
            loading: true
          })
        }
      )
    }
  };

  onProcess = async (photo) => {
    const compressed = await ImageManipulator.manipulateAsync(
      photo,
      [{ resize: { width: 200 } }],
      { base64: true }
    );
    let imageBytes = this.getBinary(compressed.base64);
    let params = {
      Image: {
        Bytes: imageBytes
      }
    };
    let rekognition = new AWS.Rekognition(credential);
    const getResult = rekognition.detectText(params).promise();
    getResult.then((data) => {
      this.setState({
        loading: false,
        response: data.TextDetections.map(e => e.DetectedText)
      });
    }).catch((err) => {
      this.setState({
        loading: false,
        response: []
      });
    });
  }

  getBinary(base64Image) {
    let binaryImg = atob(base64Image);
    let length = binaryImg.length;
    let ab = new ArrayBuffer(length);
    let ua = new Uint8Array(ab);
    for (let i = 0; i < length; i++) {
      ua[i] = binaryImg.charCodeAt(i);
    }
    return ab;
  }

  render() {
    const { hasCameraPermission } = this.state;
    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      return <Text>No access to camera</Text>;
    } else {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {
              this.state.loading === true &&
              <View style={{ backgroundColor: '#fff', padding: 15, height: Dimensions.get('window').height, justifyContent: 'center', flexDirection: 'column' }}>
                <ActivityIndicator size="large" color="#999" />
                <Text style={{ marginTop: 15, fontSize: 18, textAlign: 'center' }}>Getting Text Results...</Text>
              </View>

            }
            {
              this.state.loading === false && this.state.response.length > 0 &&
              <View style={{ padding: 15 }}>
                <Text style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: 15, fontSize: 22 }}>Predicted Results</Text>
                <Text style={{ textAlign: 'center', fontSize: 18, color: 'blue', marginTop: 0, marginBottom: 15, padding: 10 }} onPress={() => {
                  this.setState({
                    response: []
                  })
                }}>Clear Results</Text>
                {
                  this.state.response.map((data, i) => (
                    < Text key={i} style={{ marginTop: 5, padding: 5, fontSize: 16 }}>
                      {(i + 1) + ' . '} {data}
                    </Text>
                  ))
                }
              </View>

            }
            {
              this.state.loading === false && this.state.response.length === 0 &&
              <View style={{ display: 'flex', height: Dimensions.get('window').height, justifyContent: 'space-around', alignItems: 'center', flexDirection: 'column' }}>
                <Camera
                  autoFocus={true}
                  ref={ref => {
                    this.camera = ref;
                  }}
                  style={{ height: 320, width: 220 }} type={this.state.type}>
                </Camera>
                <View>
                  <TouchableOpacity
                    onPress={this.takePicture}
                    style={{ alignSelf: 'center' }}
                  >
                    <Ionicons name="ios-radio-button-on" size={70} color="black" />
                  </TouchableOpacity>
                </View>
              </View>
            }
          </ScrollView>
        </SafeAreaView>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
    backgroundColor: '#fff'
  }
});