/* 注入Page */

const nativePage = Page;

/* 组件文件夹 */
const baseComponent = "./components/";

/* 错误消息 */
const handlerError = (name, type, msg) => {
  let errors = [msg];
  if (name) {
    errors[1] = `error occur in the ${type} : ${name}`;
  }
  throw new Error(errors.join("\n"));
};

/* 解析URL */
let parseUrl = url => {
  url = baseComponent + url;
  if (/.js$/.test(url)) {
    return [url];
  } else {
    return [url + ".js", url + "/index.js"];
  }
};

/* 替换原值 */
let assign = (first, second) => {
  if (typeof second !== "object" || Array.isArray(second) || second === null) {
    return second;
  }
  if (first == null) {
    first = Object.create(null);
  }
  let keys = Object.keys(second);
  for (let key of keys) {
    first[key] = assign(first[key], second[key]);
  }
  return first;
};

/* 解析数据 */
let parseData = (name, originData, data) => {
  let value, type;
  let result = Object.create(null);
  let keys = Object.keys(data);
  for (let key of keys) {
    value = data[key];
    type = typeof value;
    if (type === "object" && type !== null) {
      result[`${name}.${key}`] = assign(originData[key], value);
    } else {
      result[`${name}.${key}`] = value;
    }
  }
  return result;
};

/* 引入组件 */
let requireCo = name => {
  if (!name) {
    return null;
  }
  let result, currentUrl;
  let urls = parseUrl(name);
  let errorUrl = urls.map(v => v.slice(2)).join(",");
  while (!result && (currentUrl = urls.shift())) {
    try {
      result = require(currentUrl);
    } catch (e) {
      result = null;
    }
  }
  if (!result) {
    handlerError(
      null,
      "component",
      `import component error :${errorUrl} can not find,please check.`
    );
  }
  if (result && typeof result.initComponent !== "function") {
    handlerError(currentUrl, "component", "can not find initComponent.");
  }
  try {
    result = result.initComponent();
  } catch (e) {
    handlerError(currentUrl, "component", e.message);
  }
  if (!result.name) {
    result.name = name;
  }
  return result;
};

/* 受保护的属性 */
const protectedProperty = ["name", "parent", "data", "setData"];

/* 受保护的页面事件 */
const protectedEvent = [
  "onLoad",
  "onReady",
  "onShow",
  "onHide",
  "onUnload",
  "onPullDownRefreash",
  "onReachBottom",
  "onPageScroll"
];

/* 创建一个新的Component作用域 */
const createComponentThis = (component, page) => {
  let name = component.name;
  if (page[`__${name}.this__`]) {
    return page[`__${name}.this__`];
  }
  let keys = Object.keys(component);
  let newThis = Object.create(null);
  let protectedKeys = protectedProperty.concat(protectedEvent);
  let otherKeys = keys.filter(v => !~protectedKeys.indexOf(v));
  for (let key of otherKeys) {
    if (typeof component[key] === "function") {
      Object.defineProperty(newThis, key, {
        get() {
          return page[`${name}.${key}`];
        },
        set(val) {
          page[`${name}.${key}`] = val;
        }
      });
    } else {
      Object.defineProperty(newThis, key, {
        get() {
          return component[`${key}`];
        },
        set(val) {
          component[`${key}`] = val;
        }
      });
    }
  }
  Object.defineProperty(newThis, "name", {
    configurable: false,
    enumerable: false,
    get() {
      return name;
    }
  });
  Object.defineProperty(newThis, "data", {
    configurable: false,
    enumerable: false,
    get() {
      return page.data[name];
    }
  });
  Object.defineProperty(newThis, "parent", {
    configurable: false,
    enumerable: false,
    get() {
      return page;
    }
  });
  Object.defineProperty(newThis, "setData", {
    value: function(data) {
      page.setData(parseData(name, this.data, data));
    },
    enumerable: false,
    configurable: false
  });
  page[`__${name}.this__`] = newThis;
  return newThis;
};

/* 绑定子组件生命周期钩子函数 */
const bindComponentLifeEvent = page => {
  let components = page.components;
  for (let key of protectedEvent) {
    let symbols = page[Symbol["for"](key)];
    let pageLifeFn = page[key];
    if (Array.isArray(symbols) && symbols.length > 0) {
      if (typeof pageLifeFn === "function") {
        symbols.push({
          fn: pageLifeFn,
          type: "page",
          context: page
        });
      }
      page[key] = function() {
        let pageThis = this;
        let args = Array.from(arguments);
        for (let ofn of symbols) {
          let currentThis;
          if (ofn.type === "component") {
            currentThis = createComponentThis(ofn.context, pageThis);
          } else {
            currentThis = pageThis;
          }
          args.length < 5
            ? ofn.fn.call(currentThis, ...args)
            : ofn.fn.apply(currentThis, args);
        }
      };
    }
  }
};

/* 自定义Page */
Page = data => {
  let components = data.components;
  if (!components || !Array.isArray(components) || !components.length) {
    return nativePage(data);
  }
  if (typeof data.data !== "object") {
    data.data = Object.create(null);
  }
  let cos = components.map(requireCo).filter(Boolean);
  let c = cos.reduce(
    (o, v) => {
      v = { ...v };
      if (!v.name) {
        handlerError(
          o.name,
          "component",
          `component must define unique name,but now get ${v.name} name`
        );
      }
      if (o[v.name]) {
        handlerError(
          o.name,
          "page",
          `page register duplicate ${v.name} component,Please make sure to be unique`
        );
      }
      if (v.data) {
        o.data = { ...o.data, [v.name]: v.data };
      }
      for (let key of protectedEvent) {
        if (typeof v[key] === "function") {
          let symbol = Symbol["for"](key);
          !Array.isArray(o[symbol]) && (o[symbol] = []);
          o[symbol].push({
            fn: v[key],
            type: "component",
            context: v
          });
        }
      }
      let fns = Object.keys(v).filter(
        vv => v.hasOwnProperty(vv) && typeof v[vv] === "function"
      );
      for (let fn of fns) {
        o[`${v.name}.${fn}`] = function() {
          let newThis = createComponentThis(v, this);
          let args = Array.from(arguments);
          args.length < 5
            ? v[fn].call(newThis, ...args)
            : v[fn].apply(newThis, args);
        };
      }
      o[v.name] = true;
      return o;
    },
    { ...data }
  );
  bindComponentLifeEvent(c);
  nativePage(c);
};
