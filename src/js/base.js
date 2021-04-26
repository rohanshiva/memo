// import * as JsStore from 'jsstore';
// import { IDataBase, DATA_TYPE, ITable } from 'jsstore';
// import * as JsStoreWorker from "jsstore/dist/jsstore.worker.commonjs2";
// window['JsStoreWorker'] = JsStoreWorker;
import {Deta} from 'deta';



function getCookieValue(a) {
	var b = document.cookie.match('(^|;)\\s*' + a + '\\s*=\\s*([^;]+)')
	return b ? b.pop() : null
}
class Base {
  async init() {
    this.deta = Deta(getCookieValue("pk"))
  }
  async getFiles(db, query) {
    const filesGen = db.fetch(query);
    var files = [];

    for await (const storedFiles of filesGen) {
      for (let file of storedFiles) {
        file.id = file.key;
        delete file.key
        files.push(file);
      }
    }
    return files;
  }
  async insert(table, value) {
    const db = this.deta.Base(table);

    value.text = (value.text == null) ? " " : value.text
    try {
      let res = await db.put(value);
      return true
    } catch (err) {
      console.log(err);
    }
  }

  sortRes(items, order) {
    const by = order.by
    const type = order.type

    if (type === "asc") {
      return items.sort((a, b) => a[by] - b[by])
    }
    else {
      return items.sort((a, b) => b[by] - a[by])
    }
  }
  async select(table, where, order, limit) {
    const db = this.deta.Base(table);

    let query = {}
    if (where) {
      if (where.id) {
        let res = await db.get(where.id);
        res.id = res.key;
        delete res.key
        return [res];
      }
      else if (where.title && where.title['like']) {
        query['title?contains'] = where.title['like']
      }
      else if (where.pos && where.pos['>=']) {
        query['pos?gte'] = where.pos['>='];

      }
      else {
        query = where
      }
    }

    let res = await this.getFiles(db, query);
    if (order) {
      res = this.sortRes(res, order);
    }
    if (limit && limit < res.length) {
      res = res.slice(0, limit);
    }

    return res;
  }
  async remove(db, rows) {
    for (const row of rows) {
      await db.delete(row.id);
    }
    return rows
  }
  //done
  async delete(table, where, limit) {
    const db = this.deta.Base(table);

    if (where.id) {
      return await db.delete(where.id);
    }

    let rows = await this.getFiles(db, where);
    if (limit && limit < rows.length) {
      rows = rows.slice(0, limit);
    }

    let rowsDeleted = await this.remove(db, rows);
    return rowsDeleted;
  }

  async update(table, where, updates, limit) {
    const db = this.deta.Base(table);

    if (updates.pos) {
      if (updates.pos["-"]) {
        updates.pos = db.util.increment(-1)
      }
      if (updates.pos["+"]) {
        updates.pos = db.util.increment(1)
      }
    }
    updates.text = (updates.text === "") ? " " : updates.text

    try {
      if (where.id) {
        const res = await db.update(updates, where.id);
        return res;
      }
      const toUpdate = await this.getFiles(db, where);
      for (const line of toUpdate) {
        await db.update(updates, line.id);
      }
      return true;
    } catch (err) {
      console.log(err)
    }
  }
  async getPref(pref) {
    const db = this.deta.Base("prefs");
    let res = await db.get(pref);
    if (!res) {
      if (pref === 'theme'){
      await this.updatePref(pref, "light");
      }
      else {
        await this.updatePref(pref, "USD");
      }
    }
    res = await db.get(pref);
    return res.value;
  }
  async updatePref(pref, to) {
    const db = this.deta.Base("prefs")
    const res = await db.put({key: pref, value: to})
    return res
  }
  // Done
  async count(table, where) {
    const db = this.deta.Base(table);
    let rows = await this.getFiles(db, where);
    let rowsCounted = rows.length;
    return rowsCounted;
  }


  getDataBaseSchema() {
    const sheet = {
      name: 'sheet',
      columns: {
        id: { primaryKey: true, autoIncrement: true },
        title: { notNull: false, dataType: "string" },
        active: { notNull: true, dataType: "number" },
        created_at: { notNull: true, dataType: "number" },
        accessed_at: { notNull: true, dataType: "number" }
      }
    };
    const line = {
      name: 'line',
      columns: {
        id: { primaryKey: true, autoIncrement: true },
        sheet_id: { notNull: true, dataType: "number" },
        line_key: { notNull: true, dataType: "string" },
        date: { notNull: true, dataType: "string" },
        text: { notNull: false, dataType: "string" },
        pos: { notNull: true, dataType: "number" }
      }
    };
    const db = {
      name: "memo_db",
      tables: [sheet, line]
    }
    return db;
  }

}

const _db = new Base();
export default _db;
