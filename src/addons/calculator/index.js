import React, { Component } from 'react';
import './style.css';
import {API} from '../../js/apiSelector';

const addon = require("./addon.json");

function evil(fn) {
  try{
    return new Function('return ' + fn)();
  } catch(err){
    return "NaN";
  }
}

class App extends Component {
  state = {
    text: ""
  }

  componentDidMount(){
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
    this.setState({text});
  }


  renderCalculated(text){
    text = text.replace(/\) =/g, ")=");
    if(text.includes(")=")){
      let calculatables = [];
      text.split(")=").forEach(calculatable => {
        if(calculatable.includes("(")){
          calculatables.push(calculatable.split("(").slice(1).join("("));
        }
      })
      return calculatables.map((calcable, i) => {
        return <div className="calculatedNode" key={i}>[{i+1}] = {evil(calcable)}</div>
      });
    }else{
      return null;
    }
  }

  render() {
    if(this.state.text){
      let includes = this.state.text.replace(") =", ")=").includes(")=");
      if(includes){
        return (
          <>
            <div className="AddonItem">
              <svg className="AddonConfigure" viewBox="0 0 24 24" width="15" height="15" onClick={() => API.event.emit("toggle", "addons")}>
                <path d="M9 4.58V4c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v.58a8 8 0 0 1 1.92 1.11l.5-.29a2 2 0 0 1 2.74.73l1 1.74a2 2 0 0 1-.73 2.73l-.5.29a8.06 8.06 0 0 1 0 2.22l.5.3a2 2 0 0 1 .73 2.72l-1 1.74a2 2 0 0 1-2.73.73l-.5-.3A8 8 0 0 1 15 19.43V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.58a8 8 0 0 1-1.92-1.11l-.5.29a2 2 0 0 1-2.74-.73l-1-1.74a2 2 0 0 1 .73-2.73l.5-.29a8.06 8.06 0 0 1 0-2.22l-.5-.3a2 2 0 0 1-.73-2.72l1-1.74a2 2 0 0 1 2.73-.73l.5.3A8 8 0 0 1 9 4.57zM7.88 7.64l-.54.51-1.77-1.02-1 1.74 1.76 1.01-.17.73a6.02 6.02 0 0 0 0 2.78l.17.73-1.76 1.01 1 1.74 1.77-1.02.54.51a6 6 0 0 0 2.4 1.4l.72.2V20h2v-2.04l.71-.2a6 6 0 0 0 2.41-1.4l.54-.51 1.77 1.02 1-1.74-1.76-1.01.17-.73a6.02 6.02 0 0 0 0-2.78l-.17-.73 1.76-1.01-1-1.74-1.77 1.02-.54-.51a6 6 0 0 0-2.4-1.4l-.72-.2V4h-2v2.04l-.71.2a6 6 0 0 0-2.41 1.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
              </svg>
              <h5>{addon.display}</h5>
              <div>{this.renderCalculated(this.state.text)}</div>
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
