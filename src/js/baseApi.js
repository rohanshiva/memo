import makeid from './makeid';
import Event from './event';
import BaseDB from './base';
import Analytics from 'react-ga';
import Github from './octokit';
import Markdown from './markdown';
import Files from './files';

const URL = "https://api.usememo.com/";
const DEVELOPMENT = false;
const VERSION = "0.6.4";
const ANONYMOUS_USER = {
  username: 'Guest'
}

class BaseAPI {
  constructor() {
    Analytics.initialize('UA-138987685-1');
    this.development = DEVELOPMENT;
    this.event = Event;
    this.version = VERSION;
    this.online = window.navigator.onLine;
    this.analytics = Analytics;
    this.logged = false;
    this.defaultAddons = "|write-good||conversion||links||calculator|";
    this.loginInterval = false;
    this.anonymousUser = ANONYMOUS_USER;

    console.log("API: init");


    BaseDB.init().then(res => {
      console.log("BaseDB: init")
    })


  }

  isOnline() {
    return this.online;
  }

  githubLogin() {
    var url = URL + "login/" + (DEVELOPMENT ? "development" : "");

    fetch(url, { method: 'GET', credentials: 'include' })
      .then(res => res.json())
      .then((res) => {
        if (res == null) {
          console.log("NO_AUTH");
        }
        if (res) {
          if (res.session_id) {
            console.log("Logged In");
            this.logged = true;
            this.user = res;
            Github.init(this.user.token).then(status => {
              console.log("initing...");
              Github.checkUpdate().then(res => {
                console.log("checked for updates...");
                this.event.emit("sheet", "LAST_ACCESSED");
                this.event.emit("login", true);
              });
            });

            Files.listenFileDrop();
          }
        }
      }).catch(err => {
        console.log(err);
        this.offlineLogin();
      });
  }

  offlineLogin() {
    this.online = false;
    console.log("Logging in: Offline");
    this.logged = true;
    return BaseDB.count("sheet").then(sheetCount => {
      if (sheetCount == 0) {
        this.offlineFirstTime();
      } else {
        this.event.emit("sheet", "LAST_ACCESSED");
        this.event.emit("login", true);
      }
    })

    Files.listenFileDrop();
  }

  offlineFirstTime() {
    Markdown.offlineSetup().then((status) => {
      console.log("Setting up first time offline", status);
      if (status) {
        this.event.emit("sheet", "LAST_ACCESSED");
        this.event.emit("login", true);
      }
    });
  }

  githubLogout() {
    var url = URL + "logout/" + (DEVELOPMENT ? "development" : "");

    fetch(url, { method: 'GET' })
      .then(res => res.json())
      .then((res) => {
        this.event.emit("login", false);
      });
  }

  sync() {
    Github.sync().then(res => {
      if (res.status == 200) {
        this.addToStaging("flush");
      }
    });
  }

  fetch() {
    Github.fetch().then(res => {
      if (res) {
        this.addToStaging("flush");
        this.event.emit("sheet", "LAST_ACCESSED");
      }
    });
  }

  getTheme() {
    return this.getData("theme") || "light";
  }

  getSheet(sheetId) {

    this.analytics.pageview("/sheet/" + sheetId);

    let today = new Date();
    let formattedTime = String(today.getDate()).padStart(2, '0') + "/" + String(today.getMonth() + 1).padStart(2, '0') + "/" + today.getFullYear();

    let id = sheetId;
    let time = Math.round((new Date()).getTime() / 1000);
    let where, order;
    let action = "";

    if (action == "archive") {
      // `sheet` SET `active` = 0 WHERE `id` = $id AND owner_id = $user_id
      return BaseDB.update("sheet", { id }, { active: 0 });
    } else if (action == "active") {
      return BaseDB.update("sheet", { id }, { active: 1 });
    } else if (action == "rm") {
      //DELETE FROM `sheet` WHERE `id` = $id AND owner_id = $user_id
      //DELETE FROM `line` WHERE `sheet_id` = $id
      return BaseDB.delete("sheet", { id }).then((res) => {
        return BaseDB.delete("line", { sheet_id: id });
      });
    } else {
      if (id == "NEW_SHEET") {
        // INTO `sheet` (`id`, `owner_id`, `title`, `active`, `created_at`, `accessed_at`) VALUES (NULL, '$user_id', 'Untitled Sheet', 1, '$time', '$time
        return BaseDB.insert("sheet", {
          title: "Untitled Sheet",
          active: 1,
          created_at: time,
          accessed_at: time
        }).then(res => {
          if (res) {
            //SELECT id FROM `sheet` WHERE owner_id = $user_id Order by accessed_at desc LIMIT 1
            return BaseDB.select("sheet", null, {
              by: "accessed_at",
              type: "desc"
            }, 1).then(res => {

              let newAddedId = res[0].id;

              let newLineKey = makeid(5);
              //INSERT INTO `line` (`id`, `sheet_id`, `line_key`, `date`, `text`, `pos`) VALUES (NULL, '$id', '".uniqid()."', '$formatted_time', '', '0')
              return BaseDB.insert("line", {
                sheet_id: newAddedId,
                line_key: newLineKey,
                date: formattedTime,
                text: "",
                pos: 0
              }).then(res => {
                return BaseDB.select("sheet", { id: newAddedId }, null, 1).then((sheet) => {
                  let newSheet = sheet[0];
                  return BaseDB.select("line", { sheet_id: newAddedId }, { by: "pos", type: "asc" }).then(lines => {
                    newSheet.lines = lines;

                    return newSheet;
                  })
                })
              })
            });
          }
        })

      } else if (id == "LAST_ACCESSED") {

        return BaseDB.select("sheet", { active: 1 }, {
          by: "accessed_at",
          type: "desc"
        }, 1).then(res => {
          if (res[0]) {
            let lastSheet = res[0];
            return BaseDB.select("line", { sheet_id: lastSheet.id }, { by: "pos", type: "asc" }).then(lines => {
              lastSheet.lines = lines;
              BaseDB.update("sheet", { id: lastSheet.id }, { accessed_at: time });
              return lastSheet;
            });
          } else {
            // Add a new sheet for the new user!

            return BaseDB.insert("sheet", {
              title: "Untitled Sheet",
              active: 1,
              created_at: time,
              accessed_at: time
            }).then(res => {
              if (res) {
                //SELECT id FROM `sheet` WHERE owner_id = $user_id Order by accessed_at desc LIMIT 1
                return BaseDB.select("sheet", null, {
                  by: "accessed_at",
                  type: "desc"
                }, 1).then(res => {
                  let newAddedId = res[0].id;

                  let newLineKey = makeid(5);
                  //INSERT INTO `line` (`id`, `sheet_id`, `line_key`, `date`, `text`, `pos`) VALUES (NULL, '$id', '".uniqid()."', '$formatted_time', '', '0')
                  return BaseDB.insert("line", {
                    sheet_id: newAddedId,
                    line_key: newLineKey,
                    date: formattedTime,
                    text: "",
                    pos: 0
                  }).then(res => {
                    return BaseDB.select("sheet", { id: newAddedId }).then((sheet) => {
                      let newSheet = sheet[0];
                      return BaseDB.select("line", { sheet_id: newAddedId }, { by: "pos", type: "asc" }).then(lines => {
                        newSheet.lines = lines;
                        return newSheet;
                      })
                    })
                  })
                });
              }
            });

          }
        })

      } else {
        return BaseDB.select("sheet", { id }).then((sheet) => {
          let idSheet = sheet[0];
          if (idSheet) {
            return BaseDB.select("line", { sheet_id: idSheet.id }, { by: "pos", type: "asc" }).then(lines => {
              idSheet.lines = lines;
              BaseDB.update("sheet", { id }, { accessed_at: time });
              return idSheet;
            });
          } else {
            return "removed";
          }
        });
      }
    }

  }

  getConversions() {
    return fetch("https://api.exchangeratesapi.io/latest?base=USD")
      .then(res => res.json());
  }

  async getSheets(active, count) {

    if (count) {
      let sheetCount = await BaseDB.count("sheet", { active: active });
      return sheetCount;
    }

    let sheets = await BaseDB.select("sheet", { active: active }, {
      by: "accessed_at",
      type: "desc"
    });

    for (var i = 0; i < sheets.length; i++) {

      let sheet = sheets[i];
      let lines = await BaseDB.select("line", { sheet_id: sheet.id }, { by: "pos", type: "asc" });
      if (lines[0]) {
        sheets[i].first_line = lines[0].text.replace(/<[^>]*>|#/g, '');
      } else {
        sheets[i].first_line = "";
      }
      sheets[i].line_count = lines.length;
    }

    return sheets;
  }

  async searchSheets(term) {
    let sheets = await BaseDB.select("sheet", { title: { like: term } }, {
      by: "accessed_at",
      type: "desc"
    });

    for (var i = 0; i < sheets.length; i++) {
      let sheet = sheets[i];
      let lines = await BaseDB.select("line", { sheet_id: sheet.id }, { by: "pos", type: "asc" });
      sheets[i].first_line = lines[0].text.replace(/<[^>]*>|#/g, '');
      sheets[i].line_count = lines.length;
    }

    return sheets;
  }
  updateLine(id, pos, text, action, hint) {
    // pos, text, action, hint
    let date = id.split("-")[0].split("!")[1];
    let line_key = id.split("-")[1];
    let sheet_id = String((id.split("-")[0].split("!")[0]));

    this.addToStaging(sheet_id);

    if (action == "rm") {
      //DELETE FROM `line` WHERE `date` = '$date' AND `sheet_id` = '$sheetId' AND `pos` = '$pos
      //UPDATE `line` SET pos = pos-1 WHERE `pos` >= $pos AND sheet_id = $sheetId
      return BaseDB.delete("line", { date, sheet_id, pos }).then(() => {
        return BaseDB.update("line", {
          pos: {
            '>=': pos
          },
          sheet_id
        }, {
          pos: {
            '-': 1
          }
        });
      });
    } else {
      let setFound = { text };
      let whereCheck = { date, sheet_id, pos, line_key };
      if (action == "key") {
        setFound.line_key = line_key;
        whereCheck.line_key = hint;
      }

      //SELECT id FROM `line` WHERE `date` = '$date' AND `sheet_id` = '$sheetId' AND `pos` = '$pos' AND `line_key` = '$checkKey' LIMIT 1
      return BaseDB.select("line", whereCheck, null, 1).then((line) => {

        if (line.length == 1) {
          //UPDATE `line` SET `text` = '$text'$updateKey WHERE `id` = $lineId
          return BaseDB.update("line", { id: line[0].id }, setFound);
        } else {
          //UPDATE `line` SET pos = pos+1 WHERE `pos` >= $pos AND sheet_id = $sheetId

          return BaseDB.select("line", {
            pos: {
              '>=': pos
            },
            sheet_id
          }).then(res => {
            res.forEach(line => {
              BaseDB.update("line", {
                id: line.id
              }, {
                pos: {
                  '+': 1
                }
              })
            });
            //INSERT INTO `line` (`id`, `sheet_id`, `line_key`, `date`, `text`, `pos`) VALUES (NULL, '$sheetId', '$key', '$date', '$text', '$pos
            return BaseDB.insert("line", {
              sheet_id,
              line_key,
              date,
              text,
              pos
            });
          });
        }
      });
    }
  }


  updateTitle(text, sheetId) {

    this.addToStaging(sheetId);
    return BaseDB.update("sheet", {
      id: sheetId
    }, {
      title: text
    });
  }

  // toStatus is true or false
  archiveUpdate(sheetId, toStatus) {
    this.addToStaging(sheetId);
    return BaseDB.update("sheet", {
      id: sheetId
    }, {
      active: toStatus ? 1 : 0
    });
  }

  deleteSheet(sheetId) {
    this.addToStaging(sheetId);
    return BaseDB.delete("sheet", {
      id: sheetId
    }).then(sheet => {
      return BaseDB.delete("line", { sheet_id: sheetId });
    });
  }



  updatePreference(pref, to) {
    this.setData(pref, to);
    BaseDB.updatePref(pref, to).then((res) => {
      console.log(pref + ": ", to);
    })
  }

  addToStaging(sheetId) {
    if (sheetId == "flush") {
      this.setData("staging", "");
      console.log("staging is flushed");
      this.event.emit("sync", "flushed");
    } else {
      let currentStaging = this.getData("staging") || "";
      if (!currentStaging.includes(`|${sheetId}|`)) {
        if (currentStaging) {
          currentStaging += `,|${sheetId}|`;
        } else {
          currentStaging = `|${sheetId}|`;
        }
        this.setData("staging", currentStaging);
        this.event.emit("sync", currentStaging.split(",").length);
        console.log("Needs to sync: ", currentStaging);
      }
    }
  }

  setGistId(gistId) {
    this.user.gist_id = gistId;
    var url = URL + "user/" + (DEVELOPMENT ? "development" : "");
    var formData = new FormData();
    formData.append('gist_id', gistId);

    return fetch(url, { method: 'POST', credentials: 'include', body: formData })
      .then(res => res.json());
  }

  setData(key, data) {

    return localStorage.setItem(key, data);

  }

  getData(key) {
    return localStorage.getItem(key);
  }
}

const _api = new BaseAPI();
export default _api;
