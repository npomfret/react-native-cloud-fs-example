'use strict';

import React, {Component} from "react";
import {AppRegistry, TouchableOpacity, StyleSheet, Text, View, TextInput, Platform, CameraRoll, StatusBar, ScrollView} from "react-native";
import RNFS from "react-native-fs";
import RNCloudFs from "react-native-cloud-fs";

export default class RNCloudFSExample extends Component {
  constructor(props) {
    super(props);

    this.state = {
      tmpFilePath: "",
      filename: "",
      imageFilename: "",
      imagePath: ""
    }
  }

  async componentDidMount() {
    const tmpFilePath = RNFS.DocumentDirectoryPath + '/test.txt';

    await RNFS.writeFile(tmpFilePath, 'This is a test file ' + new Date().toISOString(), 'utf8');
    this.setState({
      tmpFilePath: tmpFilePath,
      filename: "my-file.txt"
    });

    const res = await RNCloudFSExample._getPhoto();
    if (res.edges.length > 0) {
      const imageFilename = res.edges[0].node.image.filename;//iOS only

      this.setState({
        imagePath: res.edges[0].node.image.uri,
        imageFilename: imageFilename ? imageFilename : "image.jpeg"
      });
    }
  }

  static _getPhoto() {
    const fetchParams = {
      first: 1,
      groupTypes: "SavedPhotos",
      assetType: "Photos"
    };

    if (Platform.OS === "android") {
      delete fetchParams.groupTypes;
    }

    return CameraRoll.getPhotos(fetchParams);
  }

  render() {
    return (
      <ScrollView contentContainerStyle={{flex: 1, padding: 8}}>
        <StatusBar hidden={true}/>

        <View style={{alignItems: 'center', backgroundColor: '#d2ceab', padding: 4, borderRadius: 4, marginBottom: 4}}>
          <Text style={styles.heading}>operation: copy to cloud</Text>

          <SaveFileContainer
            sourcePath={{path: this.state.tmpFilePath}}
            targetPath={"absolute-path-demo/" + this.state.filename}
            heading="absolute path"/>

          <SaveFileContainer
            sourcePath={{uri: "file:/" + this.state.tmpFilePath}}
            targetPath={"file-url-demo/" + this.state.filename}
            heading="file url"/>

          <SaveFileContainer
            sourcePath={{uri: "https://raw.githubusercontent.com/npomfret/react-native-cloud-fs/master/README.md"}}
            targetPath={"web-url-demo/README.md"}
            heading="url"/>

          <SaveFileContainer
            sourcePath={{uri: this.state.imagePath}}
            targetPath={"image-demo/" + this.state.imageFilename}
            heading="internal url"/>
        </View>

        <View style={{alignItems: 'center', backgroundColor: '#b7d2b1', padding: 4, borderRadius: 4, marginBottom: 4}}>
          <Text style={styles.heading}>operation: list files</Text>

          <FileBrowser />
        </View>

      </ScrollView>
    );
  }
}

class SaveFileContainer extends Component {
  constructor(props) {
    super(props);

    this._saveFile = this._saveFile.bind(this);
  }

  static propTypes = {
    sourcePath: React.PropTypes.object.isRequired,
    targetPath: React.PropTypes.string.isRequired,
    heading: React.PropTypes.string.isRequired,
  };

  _saveFile(sourcePath, targetPath) {
    const mimeType = null;//for android only - and if null the java code will take a guess
    return RNCloudFs.copyToCloud(sourcePath, targetPath, mimeType)
      .then((res) => {
        console.log("it worked", res);
      })
      .catch((err) => {
        console.warn("it failed", err);
      })
  }

  render() {
    return <View style={styles.container}>
      <View style={{flex: 1}}>
        <Text style={styles.heading}>{this.props.heading}</Text>

        <TextInput underlineColorAndroid="transparent" style={styles.url} value={this.props.sourcePath.uri ? this.props.sourcePath.uri : this.props.sourcePath.path}/>

        <View style={{alignItems: 'center'}}>
          <View style={{flexDirection: 'row', justifyContent: 'center'}}>
            <TouchableOpacity onPress={() => this._saveFile(this.props.sourcePath, this.props.targetPath)}><Text style={styles.button}>save to cloud</Text></TouchableOpacity>
          </View>
          <Text style={[styles.heading, {fontStyle: 'italic'}]}>({this.props.targetPath})</Text>
        </View>
      </View>
    </View>
  }
}

class FileBrowser extends Component {
  constructor(props) {
    super(props);
  }

  componentWillMount() {
    this.setState({
      currentWorkingDirectory: null,
    });
  }

  componentDidMount() {
    this.setState({
      currentWorkingDirectory: ".",
    });
  }

  async componentDidUpdate(prevProps, prevState) {
    const currentWorkingDirectory = this.state.currentWorkingDirectory;

    if (prevState.currentWorkingDirectory !== currentWorkingDirectory) {
      try {
        const output = await RNCloudFs.listFiles(currentWorkingDirectory);
        console.log("listfiles", currentWorkingDirectory, output);
        this.setState({dirData: output});
      } catch (e) {
        console.warn("list files failed", e);
      }
    }
  }

  render() {
    if(!this.state.dirData) {
      return <View/>
    }

    const files = [{name: "..", isDirectory: true}].concat(this.state.dirData.files);

    return (
      <View style={styles.container}>

        <View style={{flex: 1}}>
          <Text style={{textAlign: 'center', marginBottom: 8}}>dir: {this.state.dirData.path}</Text>

          {
            files.map((file) => {
              return <View style={{flexDirection: 'row', marginBottom: 8}} key={file.name}>
                {
                  file.isDirectory ?
                    <TouchableOpacity onPress={() => this.setState({currentWorkingDirectory: this.state.currentWorkingDirectory + "/" + file.name})}>
                      <Text style={{fontSize: 14, marginRight: 4, color: 'blue'}}>{file.name}</Text>
                    </TouchableOpacity> :

                    <View style={{flexDirection: 'row'}}>
                      {<Text style={{fontSize: 14, marginRight: 4}}>{file.name}</Text>}
                      <Text style={{fontSize: 10, marginRight: 4}}>{file.size / 1024}kb</Text>
                    </View>
                }
              </View>
            })
          }
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: 'grey',
    borderRadius: 4,
    marginBottom: 8,
    flexDirection: 'row',
    padding: 4,
  },
  heading: {
    fontSize: 12,
    textAlign: 'left'
  },
  url: {
    paddingVertical: 0,
    height: 20,
    borderColor: 'gray',
    borderWidth: 1,
    fontSize: 8,
    paddingHorizontal: 2,
    color: 'blue'
  },
  button: {
    margin: 2,
    padding: 2,
    borderWidth: 1,
    fontSize: 10,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'black',
    color: 'white',
    fontWeight: '600'
  }
});

AppRegistry.registerComponent('RNCloudFSExample', () => RNCloudFSExample);

