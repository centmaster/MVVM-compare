## vue-router源码分析

[TOC]



#### 目录结构

先来看整体的目录结构

src

   |---components

​	|---link.js

​	|---view.js

​    |---history

​	|---base.js

​    |---util

​	 |---route.js

​    |---index.js							入口文件

​    |—create-matcher.js					创建match匹配函数

​    |---create-route-map.js					匹配路由纪录的map

​    |—install.js							插件的install方法		



如果想看具体完整的目录在这里：https://github.com/vuejs/vue-router/tree/dev/src

我们指对于源码有个宏观的掌握，具体的细节就不一一贴出来，都可以在目录文件中找到



#### 入口

```javascript
import Vue from 'vue'
import VueRouter from 'vue-router'

// 1. 插件
// 安装 <router-view> and <router-link> 组件
// 且给当前应用下所有的组件都注入 $router and $route 对象
Vue.use(VueRouter)

// 2. 定义各个路由下使用的组件，简称路由组件
const Home = { template: '<div>home</div>' }
const Foo = { template: '<div>foo</div>' }
const Bar = { template: '<div>bar</div>' }

// 3. 创建 VueRouter 实例 router
const router = new VueRouter({
  mode: 'history',
  base: __dirname,
  routes: [
    { path: '/', component: Home },
    { path: '/foo', component: Foo },
    { path: '/bar', component: Bar }
  ]
})

// 4. 创建 启动应用
// 一定要确认注入了 router 
// 在 <router-view> 中将会渲染路由组件
new Vue({
  router,
  template: `
    <div id="app">
      <h1>Basic</h1>
      <ul>
        <li><router-link to="/">/</router-link></li>
        <li><router-link to="/foo">/foo</router-link></li>
        <li><router-link to="/bar">/bar</router-link></li>
        <router-link tag="li" to="/bar">/bar</router-link>
      </ul>
      <router-view class="view"></router-view>
    </div>
  `
}).$mount('#app')
```

根据入口文件我们可以把本篇文章分为四部分去讲。1.插件 2.实例化vueRouter 3.实例化Vue 4.link和view

#### 插件机制

我们可以看到利用 Vue.js 提供的插件机制 `.use(plugin)` 来安装 `VueRouter`，而这个插件机制则会调用该 `plugin` 对象的 `install` 方法（当然如果该 `plugin` 没有该方法的话会把 `plugin` 自身作为函数来调用）

在install.js中我们可以看到vue插件的经典写法。

```javascript
import { install } from './install'
// ...
import { inBrowser, supportsHistory } from './util/dom'
// ...

export default class VueRouter {
// ...
}

// 赋值 install
VueRouter.install = install

// 自动使用插件
if (inBrowser && window.Vue) {
  window.Vue.use(VueRouter)
}
```

我们可以继续在目录中查找install.js，查阅发现，主要逻辑将$route,$router注入vue原型中。所有vue组件都是vue的实例，所以都可以访问到。

#### 实例化VueRouter

在入口文件中，首先要实例化一个 `VueRouter` ，然后将其传入 Vue 实例的 `options` 中。

```javascript
// ...
import { createMatcher } from './create-matcher'
// ...
export default class VueRouter {
// ...
  constructor (options: RouterOptions = {}) {
    this.app = null
    this.options = options
    this.beforeHooks = []
    this.afterHooks = []
    // 创建 match 匹配函数
    this.match = createMatcher(options.routes || [])
    // 根据 mode 实例化具体的 History
    let mode = options.mode || 'hash'
    this.fallback = mode === 'history' && !supportsHistory
    if (this.fallback) {
      mode = 'hash'
    }
    if (!inBrowser) {
      mode = 'abstract'
    }
    this.mode = mode

    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base)
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
      case 'abstract':
        this.history = new AbstractHistory(this)
        break
      default:
        assert(false, `invalid mode: ${mode}`)
    }
  }
// ...
}
```

这里引出两个文件create-matcher.js和create-route-map.js。前者根据传入的routes生成对应的路由 map，然后直接返回了 `match` 匹配函数。后者根据用户路由配置对象生成普通的根据 `path` 来对应的路由记录以及根据 `name`来对应的路由记录的 map。

然后继续往下，非常重要的一步就是实例话history，在history目录下有base.js是history的基类。至此实例化VueRouter完成。

#### 实例化Vue

在Vue实例化过程中，将router传入options。

创建一个 Vue 实例，对应的 `beforeCreate` 钩子就会被调用：

```javascript
// ...
  Vue.mixin({
    beforeCreate () {
      // 判断是否有 router
      if (this.$options.router) {
      	// 赋值 _router
        this._router = this.$options.router
        // 初始化 init
        this._router.init(this)
        // 定义响应式的 _route 对象
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      }
    }
  })
```

实例化过程中值得关注的两件事`router.init` 和 定义响应式的 `_route` 对象。router.init在index.js文件中

```javascript
import { install } from './install'
import { createMatcher } from './create-matcher'
import { HashHistory, getHash } from './history/hash'
import { HTML5History, getLocation } from './history/html5'
import { AbstractHistory } from './history/abstract'
import { inBrowser, supportsHistory } from './util/dom'
import { assert } from './util/warn'

export default class VueRouter {
// ...
  init (app: any /* Vue component instance */) {
// ...
    this.app = app

    const history = this.history

    if (history instanceof HTML5History) {
      history.transitionTo(getLocation(history.base))
    } else if (history instanceof HashHistory) {
      history.transitionTo(getHash(), () => {
        window.addEventListener('hashchange', () => {
          history.onHashChange()
        })
      })
    }

    history.listen(route => {
      this.app._route = route
    })
  }
// ...
}
// ...
```

可以看到初始化主要就是给 `app` 赋值，针对于 `HTML5History` 和 `HashHistory` 特殊处理，因为在这两种模式下才有可能存在进入时候的不是默认页，需要根据当前浏览器地址栏里的 `path` 或者 `hash` 来激活对应的路由，此时就是通过调用 `transitionTo` 来达到目的；而且此时还有个注意点是针对于 `HashHistory` 有特殊处理，为什么不直接在初始化 `HashHistory` 的时候监听 `hashchange` 事件呢？这个是为了修复[vuejs/vue-router#725](https://github.com/vuejs/vue-router/issues/725)这个 bug 而这样做的，简要来说就是说如果在 `beforeEnter` 这样的钩子函数中是异步的话，`beforeEnter` 钩子就会被触发两次，原因是因为在初始化的时候如果此时的 `hash` 值不是以 `/`开头的话就会补上 `#/`，这个过程会触发 `hashchange` 事件，所以会再走一次生命周期钩子，也就意味着会再次调用 `beforeEnter` 钩子函数。

#### router-link 和 router-view 组件

router-view在view.js文件中。可以看到逻辑还是比较简单的，拿到匹配的组件进行渲染就可以了。同文件夹中的link.js用来构造router-link.可以看出 `router-link` 组件就是在其点击的时候根据设置的 `to` 的值去调用 `router` 的 `push` 或者 `replace` 来更新路由的，同时呢，会检查自身是否和当前路由匹配（严格匹配和包含匹配）来决定自身的 `activeClass` 是否添加



#### Router 总结

##### Vuex-router 预备知识

###### 利用H5History API 无刷新更改地址栏

浏览器历史记录可以看作一个「栈」。

###### pushState(state, "My Profile", "/profile/") 方法

当调用他们修改浏览器历史记录栈后，虽然当前URL改变了，但浏览器不会立即发送请求该URL

执行`pushState`函数之后，会往浏览器的历史记录中添加一条新记录，同时改变地址栏的地址内容。它可以接收三个参数，按顺序分别为：

1. 一个对象或者字符串，用于描述新记录的一些特性。这个参数会被一并添加到历史记录中，以供以后使用。这个参数是开发者根据自己的需要自由给出的。
2. 一个字符串，代表新页面的标题。当前基本上所有浏览器都会忽略这个参数。
3. 一个字符串，代表新页面的相对地址。

###### popstate 事件

当用户点击浏览器的「前进」、「后退」按钮时，就会触发`popstate`事件。你可以监听这一事件，从而作出反应。

###### replaceState 方法

有时，你希望不添加一个新记录，而是替换当前的记录（比如对网站的 landing page），则可以使用`replaceState`方法。这个方法和`pushState`的参数完全一样。



###### 利用浏览器的hash特点

\#符号本身以及它后面的字符称之为hash，可通过window.location.hash属性读取。它具有如下特点：

- hash虽然出现在URL中，但不会被包括在HTTP请求中。它是用来指导浏览器动作的，对服务器端完全无用，因此，改变hash不会重新加载页面

- 可以为hash的改变添加监听事件：

  ```
  window.addEventListener("hashchange", funcRef, false)

  ```

- 每一次改变hash（window.location.hash），都会在浏览器的访问历史中增加一个记录

###### HashHistory.push()

```javascript
window.location.hash = route.fullPath
```



##### vue-router的具体实现的比较（https://zhuanlan.zhihu.com/p/27588422）

“更新视图但不重新请求页面”是前端路由原理的核心之一，目前在浏览器环境中这一功能的实现主要有两种方式：

- 利用URL中的hash（“#”）
- 利用History interface在 HTML5中新增的方法

###### 利用hash

从设置路由改变到视图更新的流程如下：

```javascript
$router.push() --> HashHistory.push() --> History.transitionTo() --> History.updateRoute() -！！！-> {app._route = route} --> vm.render()
```

在感叹号这一步过程中，updateRoute的回调函数触发了mixin（应该就是vue和router的mix）

```javascript
export function install (Vue) {
  Vue.mixin({
    beforeCreate () {
      if (isDef(this.$options.router)) {
        this._router = this.$options.router
        this._router.init(this)
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      }
      registerInstance(this, this)
    },
  })
}
```

通过Vue.mixin()方法，全局注册一个混合，影响注册之后所有创建的每个 Vue 实例，该混合在beforeCreate钩子中通过Vue.util.defineReactive()定义了响应式的_route属性。所谓响应式属性，即当_route值改变时，会自动调用Vue实例的render()方法，更新视图。

repalce和push  同理，区别在于替换。另外：

```javascript
setupListeners ()  //用来监听手动替换的hash
```

###### 利用History

原理基本一样。不再赘述，方法替换就好。

###### 调用history.pushState()相比于直接修改hash主要有以下优势：

- pushState设置的新URL可以是与当前URL同源的任意URL；而hash只可修改#后面的部分，故只可设置与当前同文档的URL
- pushState设置的新URL可以与当前URL一模一样，这样也会把记录添加到栈中；而hash设置的新值必须与原来不一样才会触发记录添加到栈中
- pushState通过stateObject可以添加任意类型的数据到记录中；而hash只可添加短字符串
- pushState可额外设置title属性供后续使用











