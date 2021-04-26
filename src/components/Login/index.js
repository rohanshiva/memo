import React, { Component } from 'react';
import './style.css';
import { runningOnMicros, API } from '../../js/apiSelector';

let AUTH_URL = "https://github.com/login/oauth/authorize?client_id=d63ed284bfb2c8e7a5d4&scope=gist&redirect_uri=https://api.usememo.com/github/";

if (API.development) {
  AUTH_URL += "?development=true";
}

let isRefresh = AUTH_URL.includes("?") ? "&refresh=true" : "?refresh=true";
let AUTH_URL_REFRESH = AUTH_URL + isRefresh;


class App extends Component {

  state = {
    loginButtonText: "Login with GitHub"
  }

  componentDidMount() {
    if (this.props.forceLogout) {
      console.log("forcing logout");
      setTimeout(() => {
        API.event.emit("loginButton");
      }, 1000);
    }

    if (window.navigator.userAgent.includes("Firefox")) {
      setTimeout(() => {
        API.event.emit("loginButton");
      }, 1000);
    }
  }

  handleIframeLoad(e) {
    let iframe = this.refs._authIframe;
    let isOnline = API.isOnline();
    if (iframe && isOnline) {
      try {
        let iframeURL = (iframe.contentWindow || iframe.contentDocument).location.href;
        if (iframeURL) {
          console.warn("Already authorized by GitHub!");
        }
        API.githubLogin();
      } catch (err) {
        console.log(err);
        console.warn("User haven't given authorization to Memo app on GitHub yet!");
        API.githubLogin();
        setTimeout(() => {
          API.event.emit("loginButton");
        }, 2000);
      }

    }
    if (!isOnline) {
      API.offlineLogin();
    }
  }

  render() {

    return (
      <>
        <div className="Login">
          <a href={AUTH_URL}>
            <div className="loginWithGithub" onClick={() => this.setState({ loginButtonText: "Just a second..." })}>
              <img src={require("../../icon/github.svg")} alt="GitHub Logo" />
              <span>{this.state.loginButtonText}</span>
            </div>
          </a>
          {!this.props.forceLogout &&
            <iframe src={AUTH_URL_REFRESH} title="GitHub Iframe" ref="_authIframe" onLoad={(event) => this.handleIframeLoad(event)} className="githubIframe" frameBorder="0"></iframe>
          }
        </div>
        <div className="localModeButton" onClick={() => API.offlineLogin()}>
          <span>Use Offline</span>
        </div>

        {this.props.forceLogout &&
          <p style={{ width: 300, textAlign: "center", lineHeight: "1.5em" }}>You might also need to sign off from GitHub to login with another Account.</p>
        }
      </>
    );
  }
}

export default App;
