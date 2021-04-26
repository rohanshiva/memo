import React, { Component } from 'react';
import './style.css';
import {API} from '../../js/apiSelector';

import writeGood from "write-good";

const THROTTLE_LIMIT = 5; // fire for every 5 changes

class App extends Component {
  state = {
    text: ""
  }

  componentDidMount(){
    this.throttleCounter = 0;
    API.event.on("lineFocused", this.lineFocusedAction);
    API.event.on("lineChanged", this.lineChangedAction);
  }

  componentWillUnmount(){
    API.event.removeListener("lineFocused", this.lineFocusedAction);
    API.event.removeListener("lineChanged", this.lineFocusedAction);
  }

  lineFocusedAction = (line) => {
    this.setState({
      text: line.text,
      lineId: line.lineId,
      index: line.index
    });
  }

  lineChangedAction = (text) => {
    if(this.throttleCounter === THROTTLE_LIMIT){
      this.setState({text});
      this.throttleCounter = 0;
    }
    this.throttleCounter++;
  }


  render() {
    if(this.state.text){
      let writeGoodSuggestions = writeGood(this.state.text);
      if(writeGoodSuggestions.length){
        return (
          <>
            <div className="AddonItem">
              <svg className="AddonConfigure" viewBox="0 0 24 24" width="15" height="15" onClick={() => API.event.emit("toggle", "addons")}>
                <path d="M9 4.58V4c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v.58a8 8 0 0 1 1.92 1.11l.5-.29a2 2 0 0 1 2.74.73l1 1.74a2 2 0 0 1-.73 2.73l-.5.29a8.06 8.06 0 0 1 0 2.22l.5.3a2 2 0 0 1 .73 2.72l-1 1.74a2 2 0 0 1-2.73.73l-.5-.3A8 8 0 0 1 15 19.43V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.58a8 8 0 0 1-1.92-1.11l-.5.29a2 2 0 0 1-2.74-.73l-1-1.74a2 2 0 0 1 .73-2.73l.5-.29a8.06 8.06 0 0 1 0-2.22l-.5-.3a2 2 0 0 1-.73-2.72l1-1.74a2 2 0 0 1 2.73-.73l.5.3A8 8 0 0 1 9 4.57zM7.88 7.64l-.54.51-1.77-1.02-1 1.74 1.76 1.01-.17.73a6.02 6.02 0 0 0 0 2.78l.17.73-1.76 1.01 1 1.74 1.77-1.02.54.51a6 6 0 0 0 2.4 1.4l.72.2V20h2v-2.04l.71-.2a6 6 0 0 0 2.41-1.4l.54-.51 1.77 1.02 1-1.74-1.76-1.01.17-.73a6.02 6.02 0 0 0 0-2.78l-.17-.73 1.76-1.01-1-1.74-1.77 1.02-.54-.51a6 6 0 0 0-2.4-1.4l-.72-.2V4h-2v2.04l-.71.2a6 6 0 0 0-2.41 1.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
              </svg>
              <h5>Write-Good</h5>
              <div>{writeGoodSuggestions.map((s, i) => {
                return (<div className="writeGoodAdvice" key={i}>{s.reason}</div>)
              })}</div>
            </div>
          </>
        );
      }else{
        return null;
      }
    }else{
      return null;
    }
  }
}

export default App;
