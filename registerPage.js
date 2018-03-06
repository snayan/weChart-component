/* 注入Page */

const nativePage = Page;

/* 组件文件夹 */
const BASECOMPONENT = './components/';

/* 受保护的属性 */
const PROTECTEDPROPERTY = ['name', 'parent', 'data', 'setData'];

/* 受保护的页面事件 */
const PROTECTEDEVENTS = [
  'onLoad',
  'onReady',
  'onShow',
  'onHide',
  'onUnload',
  'onPullDownRefreash',
  'onReachBottom',
  'onPageScroll'
];

/* 是否包含name */
function ownHas(container, name) {
  if (container === null || container === undefined) {
    return false;
  }
  if (Array.isArray(container)) {
    return !!~container.indexOf(name);
  }
  if (typeof container === 'object') {
    return Object.hasOwnProperty.call(container, name);
  }
  return false;
}

/* 错误消息 */
function handlerError(name, type, msg) {
  let errors = [msg];
  if (name) {
    errors[1] = `error occur in the ${type} : ${name}`;
  }
  throw new Error(errors.join('\n'));
}

/* 解析URL */
function parseUrl(url) {
  let fullUrl = BASECOMPONENT + url;
  return /.js$/.test(fullUrl) ? [fullUrl] : [fullUrl + '.js', fullUrl + '/index.js'];
}

/* 替换原值 */
function assign(first, second) {
  if (typeof second !== 'object' || Array.isArray(second) || second === null) {
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
}

/* 解析数据 */
function parseData(name, originData, data) {
  let value, type;
  let result = Object.create(null);
  let keys = Object.keys(data);
  for (let key of keys) {
    value = data[key];
    type = typeof value;
    if (type === 'object' && type !== null) {
      result[`${name}.${key}`] = assign(originData[key], value);
    } else {
      result[`${name}.${key}`] = value;
    }
  }
  return result;
}

/* 引入组件 */
function requireCo(name) {
  if (!name) {
    return null;
  }
  let result, currentUrl;
  let urls = parseUrl(name);
  let errorUrl = urls.map(url => url.slice(2)).join(',');
  while (!result && (currentUrl = urls.shift())) {
    try {
      result = require(currentUrl);
    } catch (e) {
      result = null;
    }
  }
  if (!result) {
    handlerError(null, 'component', `import component error :${errorUrl} can not find,please check.`);
  }
  if (result && typeof result.initComponent !== 'function') {
    handlerError(currentUrl, 'component', 'can not find initComponent function.');
  }
  try {
    result = result.initComponent();
  } catch (e) {
    handlerError(currentUrl, 'component', e.message);
  }
  if (!result.name) {
    result.name = name;
  }
  return result;
}

/* 创建一个新的Component作用域 */
function createComponentThis(component, page) {
  let { name } = component;
  //直接返回缓存的this
  if (page[`__${name}.this__`]) {
    return page[`__${name}.this__`];
  }
  let keys = Object.keys(component);
  let newThis = Object.create(null);
  let otherKeys = keys.filter(key => !ownHas([...PROTECTEDPROPERTY, ...PROTECTEDEVENTS], key));
  for (let key of otherKeys) {
    if (typeof component[key] === 'function') {
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
  Object.defineProperty(newThis, 'name', {
    configurable: false,
    enumerable: false,
    get() {
      return name;
    }
  });
  Object.defineProperty(newThis, 'data', {
    configurable: false,
    enumerable: false,
    get() {
      return page.data[name];
    }
  });
  Object.defineProperty(newThis, 'parent', {
    configurable: false,
    enumerable: false,
    get() {
      return page;
    }
  });
  Object.defineProperty(newThis, 'setData', {
    value: function(data) {
      page.setData(parseData(name, this.data, data));
    },
    enumerable: false,
    configurable: false
  });
  page[`__${name}.this__`] = newThis;
  return newThis;
}

/* 绑定子组件生命周期钩子函数 */
function bindComponentLifeEvent(page) {
  let pageData = { ...page };
  let { components } = pageData;
  for (let key of PROTECTEDEVENTS) {
    let childPageLifeFns = pageData[Symbol['for'](key)];
    let parentPageLifeFn = pageData[key];
    if (Array.isArray(childPageLifeFns) && childPageLifeFns.length > 0) {
      if (typeof parentPageLifeFn === 'function') {
        childPageLifeFns.push({
          fn: parentPageLifeFn,
          type: 'page',
          context: pageData
        });
      }
      pageData[key] = function(...args) {
        let pageThis = this;
        for (let lifeFn of childPageLifeFns) {
          let currentThis;
          if (lifeFn.type === 'component') {
            currentThis = createComponentThis(lifeFn.context, pageThis);
          } else {
            currentThis = pageThis;
          }
          args.length < 5 ? lifeFn.fn.call(currentThis, ...args) : lifeFn.fn.apply(currentThis, args);
        }
      };
    }
  }
  return pageData;
}

/* 自定义Page */
Page = data => {
  let { components } = data;
  if (!Array.isArray(components) || !components.length) {
    return nativePage(data);
  }
  if (typeof data.data !== 'object') {
    data.data = Object.create(null);
  }
  components = components.map(requireCo).filter(Boolean);
  let registerData = components.reduce(
    (data, componentData) => {
      componentData = { ...componentData };
      if (!componentData.name) {
        handlerError(
          data.name,
          'component',
          `component must define unique name,but now get ${componentData.name} name`
        );
      }
      if (data[componentData.name]) {
        handlerError(
          data.name,
          'page',
          `page register duplicate ${componentData.name} component,Please make sure to be unique`
        );
      }
      if (componentData.data) {
        data.data = { ...data.data, [componentData.name]: { ...componentData.data } };
      }
      for (let key of PROTECTEDEVENTS) {
        if (typeof componentData[key] === 'function') {
          let symbol = Symbol['for'](key);
          !Array.isArray(data[symbol]) && (data[symbol] = []);
          data[symbol].push({
            fn: componentData[key],
            type: 'component',
            context: componentData
          });
        }
      }
      let otherFunctions = Object.keys(componentData).filter(
        attrName => typeof componentData[attrName] === 'function' && !ownHas(PROTECTEDEVENTS, attrName)
      );
      for (let fn of otherFunctions) {
        data[`${componentData.name}.${fn}`] = function(...args) {
          let newThis = createComponentThis(componentData, this);
          args.length < 5 ? componentData[fn].call(newThis, ...args) : componentData[fn].apply(newThis, args);
        };
      }
      data[componentData.name] = true;
      return data;
    },
    { ...data }
  );
  nativePage(bindComponentLifeEvent(registerData));
};
