# 微信小程序组件化编程
由于微信小程序的组件化方式不是很适用，所以，我们基于微信小程序自定义一套组件化的使用方式。

###使用

-   在app.js中引入registerPage，这个是在启动时自动改写微信小程序的Page函数，以方便后面页面注入组件 

    ```javascript
    import "./registerPage";
    ```


-   在页面引入组件，需要在传递给Page的对象中增加`components`属性，里面就是要引入的组件，之后页面会自动注入组件的`data`和其他方法到当前页面里。

    ```javascript
    Page({
      components: ["Tab", "Toast"]
    });
    ```

-   组件的书写必须是export { initComponent },且initComponent函数的返回值是子组件

    ```javascript
    function initComponent() {
      return {
        data: {
          motto:'111'
        },
        onLoad: function() {},
        click: function(event) {
          console.log(event);
        }
      };
    }

    export { initComponent };
    ```

-   组件可以定义自己的生命周期方法，生命周期方法与微信小程序页面的生命周期方法定义和含义都一样。触发机制是跟着父级页面触发的。先触发所有的组件生命周期方法，最后触发父级页面的生命周期方法。

    ```javascript
    //这里是组件支持的所有钩子函数
    function initComponent() {
      return {
        data: { motto: "1" },
        onLoad: function() {
          console.log("components onload");
        },
        onReady: function() {
          console.log("components onReady");
        },
        onShow: function() {
          console.log("components onShow");
        },
        onHide: function() {
          console.log("components onHide");
        },
        onUnload: function() {
          console.log("components onUnload");
        },
        onPullDownRefreash: function() {
          console.log("components onPullDownRefreash");
        },
        onReachBottom: function() {
          console.log("components onReachBottom");
        }
      };
    }

    export { initComponent };
    ```

-   组件的数据和作用域是与父级相互隔离的，组件内部的状态改变不会污染父级数据和作用域。组件与组件试图层之间的绑定，必须是{{ 组件名.组件数据}}形式。在组件内部更新自己的data，也需要是使用`this.setData`方法，更改之后会自动更新到组件试图层上。

    ```html
    <view bindtap="Tab.click">{{Tab.motto}}</view>
    ```

-   组件内部方法中this是指向组件自己的，this.parent是指向当前组件的父级页面的，可以通过this.parent去与父级页面通信。

    ```javascript
    /* 子组件 */
    function initComponent() {
      return {
        onLoad: function() {
          this.parent.setParentData('ahhahha')
        }
      };
    }
    export { initComponent };

    /* 父级页面 */
    Page({
      components: ["Tab", "Toast"],
      data: {
        motto: "Hello World"
      },
      setParentData: function(value) {
        this.setData({
          motto: value
        });
      }
    });
    ```

-   在父级页面中，this是指向父级页面自己，但子组件的相关信息会被自动注入到父级页面的this中，例如，子组件Tab，它的方法可以在父级页面中通过this['Tab.方法名']获取。

    ```javascript
    /* 子组件 */
    function initComponent() {
      return {
        data: { motto: "1" },
        updateTabData: function(data) {
          this.setData({
            motto: data
          });
        }
      };
    }

    export { initComponent };

    /* 父级页面 */
    Page({
      components: ["Tab", "Toast"],
      onLoad: function() {
        this["Tab.updateTabData"]("hahahah");
      }
    });
    ```

-   再依次引入组件对应的wxml和wxss，这里可以参考微信小程序SDK，方式一样。

    ```html
    //在wxml文件中引入组件的wxml
    <include src="/components/Tab/index.wxml" />

    //在wxss文件中引入组件的wxss
    @import '/components/Tab/index.wxss';
    ```

##### 原理

-   在小程序启动时劫获小程序的Page函数，在自定义的Page函数中注入子组件的相关数据到父级页面中。
-   将组件的data注入到父级页面的data下，但是组件的data会以组件name为命名空间，以隔离父级data或其他组件的data
-   将组件的一般方法（非生命周期方法）注入到父级页面的方法中，方法名变成了{组件name.方法名}
-   在组件内部的方法都会生成一个新的组件this，隔离父级this，组件this中都是定义了一系列的getter，setter方法，实际操作的是注入到父级页面中的方法。

##### 注意

-   组件里的方法必须是es5的函数声明模式，不能是es6的箭头函数，因为使用es6的箭头函数会丢失组件this。
-   组件的js达到了自动化注入，但是wxml和wxss还是得手动引入。