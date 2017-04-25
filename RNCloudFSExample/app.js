'use strict';

import React, {Component} from "react";
import {AppRegistry, Switch, TouchableOpacity, StyleSheet, Text, View, TextInput, Platform, CameraRoll, StatusBar, ScrollView, ActivityIndicator} from "react-native";
import RNFS from "react-native-fs";
import RNCloudFs from "react-native-cloud-fs";

export default class RNCloudFSExample extends Component {
  constructor(props) {
    super(props);

    this.state = {
      tmpFilePath: "",
      filename: "",
      imageFilename: "",
      imagePath: "",
      scope: 'visible'
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

  async _createFile() {
    const path = "/foo/bar/some_file_" + Math.random() + "_.txt";
    try {
      await RNCloudFs.createFile({
        targetPath: path,
        content: "some file content",
        scope: this.state.scope
      });
    } catch (err) {
      console.warn("failed to create", path, err);
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
      <ScrollView contentContainerStyle={{padding: 8}}>
        <StatusBar hidden={true}/>

        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.heading}>scope:</Text>
          <Switch
            onValueChange={(value) => this.setState({scope: value ? "visible" : 'hidden'})}
            style={{marginBottom: 10}}
            value={this.state.scope === 'visible'}/>
          <Text style={styles.heading}>{this.state.scope === 'visible' ? "visible files" : 'hidden files'}</Text>
        </View>

        <View style={{alignItems: 'center', backgroundColor: '#b7d2b1', padding: 4, borderRadius: 4, marginBottom: 4}}>
          <Text style={styles.heading}>operation: RNCloudFs.listFiles</Text>

          <FileBrowser scope={this.state.scope}/>
        </View>

        <View style={{alignItems: 'center', backgroundColor: '#a9d2c7', padding: 4, borderRadius: 4, marginBottom: 4}}>
          <Text style={styles.heading}>operation: RNCloudFs.createFile</Text>

          <TouchableOpacity onPress={() => this._createFile()}><Text style={styles.button}>create</Text></TouchableOpacity>
        </View>

        <View style={{alignItems: 'center', backgroundColor: '#d2ceab', padding: 4, borderRadius: 4, marginBottom: 4}}>
          <Text style={styles.heading}>operation: RNCloudFs.copyToCloud</Text>

          <SaveFileContainer
            sourcePath={{path: this.state.tmpFilePath}}
            targetPath={"absolute-path-demo/" + this.state.filename}
            scope={this.state.scope}
            heading="absolute path"/>

          <SaveFileContainer
            sourcePath={{uri: "file:/" + this.state.tmpFilePath}}
            targetPath={"file-url-demo/" + this.state.filename}
            scope={this.state.scope}
            heading="file url"/>

          <SaveFileContainer
            sourcePath={{uri: "https://raw.githubusercontent.com/npomfret/react-native-cloud-fs/master/README.md"}}
            targetPath={"web-url-demo/README.md"}
            scope={this.state.scope}
            heading="url"/>

          <SaveFileContainer
            sourcePath={{uri: this.state.imagePath}}
            targetPath={"image-demo/" + this.state.imageFilename}
            scope={this.state.scope}
            heading="os specific url"/>
        </View>

      </ScrollView>
    );
  }
}

class SaveFileContainer extends Component {
  constructor(props) {
    super(props);

    this._copyToCloud = this._copyToCloud.bind(this);
    this.state = {
      fileExists: false
    }
  }

  componentWillMount() {
    this._update();
  }

  static propTypes = {
    sourcePath: React.PropTypes.object.isRequired,
    targetPath: React.PropTypes.string.isRequired,
    scope: React.PropTypes.string.isRequired,
    heading: React.PropTypes.string.isRequired,
  };

  async _update() {
    const exists = await RNCloudFs.fileExists({targetPath: this.props.targetPath, scope: this.props.scope});
    this.setState({fileExists: exists})
  }

  async _copyToCloud() {
    const sourcePath = this.props.sourcePath;
    const targetPath = this.props.targetPath;

    const mimeType = null;//for android only - and if null the java code will take a guess
    try {
      const res = RNCloudFs.copyToCloud({
        sourcePath,
        targetPath: targetPath,
        mimeType,
        scope: this.props.scope
      });
      console.log("it worked", res);

      this._update();
    } catch (e) {
      console.warn("it failed", e);
    }
  }

  render() {
    return <View style={styles.container}>
      <View style={{flex: 1}}>
        <Text style={styles.heading}>{this.props.heading}</Text>

        <UrlField value={this.props.sourcePath.uri ? this.props.sourcePath.uri : this.props.sourcePath.path}/>

        <View style={{alignItems: 'center'}}>
          <View style={{flexDirection: 'row', justifyContent: 'center'}}>
            <TouchableOpacity onPress={() => this._copyToCloud()}>
              <Text style={styles.button}>save to cloud</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.heading, {fontStyle: 'italic'}]}>target: {this.props.targetPath}</Text>
          <Text style={[styles.heading, {}]}>target file exists: {this.state.fileExists.toString()}</Text>
        </View>
      </View>
    </View>
  }
}

class FileBrowser extends Component {
  constructor(props) {
    super(props);

    this.state = {
      dirData: null
    };
  }

  static propTypes = {
    scope: React.PropTypes.string.isRequired,
  };

  componentDidMount() {
    this._listFiles(".");
  }

  componentDidUpdate(prevProps, prevState) {
    const dirData = this.state.dirData;
    if (dirData && prevProps.scope !== this.props.scope) {
      this._listFiles(".");
    }
  }

  async _listFiles(currentWorkingDirectory) {
    try {
      this.setState({dirData: null});

      const output = await RNCloudFs.listFiles({
        targetPath: currentWorkingDirectory,
        scope: this.props.scope
      });
      this.setState({dirData: output});

      output.files.forEach((file) => console.log(file));
    } catch (e) {
      console.warn("list files failed", e);
    }
  }

  render() {
    if (!this.state.dirData) {
      return <View><ActivityIndicator /></View>
    }

    const files = [{name: "..", isDirectory: true}].concat(this.state.dirData.files);

    return (
      <View style={styles.container}>

        <View style={{flex: 1}}>
          <Text style={{textAlign: 'center', marginBottom: 8, fontStyle: 'italic'}}>{this.state.dirData.path}</Text>

          {
            files.map((file) => {
              return <View style={{flexDirection: 'row', marginBottom: 8}} key={file.name}>
                {
                  file.isDirectory ?
                    <TouchableOpacity onPress={() => this._listFiles(this.state.dirData.path + "/" + file.name)}>
                      <View style={{flexDirection: 'row', flex: 1}}>
                        <Text style={{fontSize: 14, marginRight: 4, color: 'grey'}}>dir: </Text>
                        <Text style={{fontSize: 14, marginRight: 4, color: 'blue'}}>{file.name}</Text>
                      </View>
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

class UrlField extends Component {
  constructor(props) {
    super(props);

    this.state = {
      text: this.props.value,
      height: 25
    };

    this.onTextChange = this.onTextChange.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    if(prevProps.value !== this.props.value) {
      this.setState({text: this.props.value});
    }
  }

  onTextChange(event) {
    const {contentSize, text} = event.nativeEvent;

    this.setState({
      text: text,
      height: contentSize.height > 100 ? 100 : contentSize.height
    });
  }

  render() {
    return (
      <TextInput
        multiline={true}
        underlineColorAndroid="transparent"
        style={[styles.textArea, {height: this.state.height}]}
        onChange={this.onTextChange}
        value={this.state.text}
      />
    );
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
  textArea: {
    borderColor: 'gray',
    borderWidth: 1,
    fontSize: 8,
    paddingHorizontal: 2,
    paddingVertical: 0,
    color: 'blue',
    backgroundColor: '#eeeeee'
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

