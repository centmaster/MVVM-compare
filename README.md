## Vue React San 框架间数据更新与绑定的分析

起因：大漠喷了尤大神以后让我真的像看看不同框架间的区别到底在哪里。各自的优缺点。没有选择Angular而是选择了学长安利的百度框架San。让我们一起来看看吧！

### 先来看三个小demo吧

##### vue:<https://centmaster.github.io/MVVM-compare/show/vue/>

打开控制台，我们可以看到效果。其中unusedcount改变了father中对象的数据，但数据没有关联到视图上，所以页面没有被再次渲染。也可以看到父子节点之间的渲染各自独立。

##### react:<https://centmaster.github.io/MVVM-compare/show/react/>

对比vue，我们可以看到，react中父节点的渲染会出发子节点的渲染，而完全没有用到的数据改变也会使得页面渲染。子节点child2由于添加的shoudcomponentupdate为false，不会被渲染。

##### San:<https://centmaster.github.io/MVVM-compare/san-test/>

san中，我们可以看到，虽然san的数据操作与react更像 ，但也是精准渲染。（ps：这里我们没有使用双向数据绑定）



> 文中具体讲解了vue中数据双向绑定的实现，react中setState和diff算法以及对san框架的一些分析。



### 三者之间的对比

在san的身上，时而看到vue的影子，时而看到react的影子。设计者们按照自己的对框架的理解拼装了san。

|                     |        vue         |          react           |             San             |
| ------------------- | :----------------: | :----------------------: | :-------------------------: |
| 数据操作（set/get/Array) |    直接操作数据(自动跟踪)    | setState／this.state.data | this.data.set／this.data.get |
| 写法                  | 模版（规整的html/css/js） |    JSX + inline style    |     模版？方法什么没有放在method里      |
| 是否实现双向绑定            |         是          |          单项数据流           |           是（= =）            |
| directive           |         是          |            否             |              是              |
| 生命钩子                |         是          |            是             |              是              |



### 三个框架关于数据的实现

#### Vue

#### 预备知识：

##### 1.Object.defineProperty(obj, prop,descriptor)

这是响应式监听的核心。我们把监听绑定在setter和getter上用来实现响应式。一下为更细节的介绍。

descriptor中定义的参数用来定义或修改的属性的描述符

`configurable` 当且仅当该属性的 configurable 为 true 时，该属性`描述符`才能够被改变，也能够被删除。

`enumerable`当且仅当该属性的 enumerable 为 true 时，该属性才能够出现在对象的枚举属性中。。

属性特性 `enumerable` 决定这个属性是否能被 `for...in` 循环或 `Object.keys` 方法遍历得到

`writable`当且仅当该属性的 writable 为 true 时，该属性才能被`[赋值运算符]`改变。

`value`该属性对应的值。可以是任何有效的 JavaScript 值（数值，对象，函数等）。

`get`一个给属性提供 getter 的方法，如果没有 getter 则为 `undefined`。该方法返回值被用作属性值。

`set`一个给属性提供 setter 的方法，如果没有 setter 则为 `undefined`。该方法将接受唯一参数，并将该参数的新值分配给该属性。

##### 2.虚拟dom

现在的vue也支持jsx的写法。vue有两种写法

```javascript
new Vue({
  data: {
    text: "before",
  },
  template: `
    <div>
      <span>text:</span> {{text}}
    </div>`
})

// render函数写法，类似react的jsx写法
new Vue({
  data: {
    text: "before",
  },
  render (h) {
    return (
      <div>
        <span>text:</span> {{text}}
      </div>
    )
  }
})
```

第一种为vue模版写法，第二种为jsx。无论二者哪种写法，最后都会被解析成这样：

```javascript
new Vue({
  data: {
    text: "before",
  },
  render(){
    return this.__h__('div', {}, [
      this.__h__('span', {}, [this.__toString__(this.text)])
    ])
  }
})
```

虚拟的dom节点长这个样子：

```javascript
function VNode(tag, data, children, text) {
  return {
    tag: tag, // html标签名
    data: data, // 包含诸如 class 和 style 这些标签上的属性
    children: children, // 子节点
    text: text // 文本节点
  }
}
```

完整的长这个样子：

```javascript
function VNode(tag, data, children, text) {
  return {
    tag: tag,
    data: data,
    children: children,
    text: text
  }
}

class Vue {
  constructor(options) {
    this.$options = options
    const vdom = this._update()
    console.log(vdom)
  }
  _update() {
    return this._render.call(this)
  }
  _render() {
    const vnode = this.$options.render.call(this)
    return vnode
  }
  __h__(tag, attr, children) {
    return VNode(tag, attr, children.map((child)=>{
      if(typeof child === 'string'){
        return VNode(undefined, undefined, undefined, child)
      }else{
        return child
      }
    }))
  }
  __toString__(val) {
    return val == null ? '' : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
  }
}

var demo = new Vue({
  el: '#demo',
  data: {
    text: "before",
  },
  render(){
    return this.__h__('div', {}, [
      this.__h__('span', {}, [this.__toString__(this.text)])
    ])
  }
})
```

#### 实现监听

##### 监听data下所有属性，实现响应式

```javascript
class Vue {
  constructor(options) {
    this.$options = options
    this._data = options.data
    observer(options.data, this._update.bind(this))
    this._update()
  }
  _update(){
    this.$options.render()
  }
}

function observer(obj) {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'object') {
      new observer(obj[key], cb)
    }
    defineReactive(obj, key, obj[key])
  })
}

function defineReactive(obj, key, val, cb) {
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: () => {
      console.log('你访问了' + key)
      return val
    },
    set: newVal => {
      if (newVal === val)
        return
      console.log('你设置了' + key)
      console.log('新的' + key + ' = ' + newVal)
      val = newVal
      cb()
    }
  })
}

var demo1 = new Vue({
  el: '#demo',
  data: {
    text: "before"
  },
  render(){
    console.log("我要render了")
  }
})
```

上式实现了对于修改对象的监听，但还不够好。demo._data.text这种写法未免太丑了吧。于是我们添加一层代理。（不懂的同学详见es6的proxy）

```javascript
_proxy(key) {
    const self = this
    Object.defineProperty(self, key, {
      configurable: true,
      enumerable: true,
      get: function proxyGetter() {
        return self._data[key]
      },
      set: function proxySetter(val) {
        self._data[key] = val
      }
    })
  }
```

然后在构造函数中加上这么一句话

```javascript
Object.keys(options.data).forEach(key => this._proxy(key))
```

到此为止，data已经变成了响应式。不过还没完！我们会发现还有一个问题可以优化。

```javascript
new Vue({
  template: `
    <div>
      <span>name:</span> {{name}}
    <div>`,
  data: {
    name: 'js',
    age: 24
  }
})

setTimeout(function(){
  demo.age = 25
}, 3000)
```

事实是，如果三秒之后修改了age属性 ，页面的name也会重新渲染。这很奇怪对不对。age这种完全不需要的东西就不需要渲染了啊。

##### 实现依赖收集，精确渲染

我们发现，当执行render函数渲染的时候，会对所有依赖的data进行获取操作。其他的元素没有依赖自然我们也就不用管。

我们需要subs这个数组来储存依赖的属性。然后在get中添加add方法，在setter中添加notify方法监听变化。

```javascript
class Dep {
  constructor() {
    this.subs = []
  }
  add(cb) {
    this.subs.push(cb)
  }
  notify() {
    console.log(this.subs)
    this.subs.forEach((cb) => cb())
  }
}

function defineReactive(obj, key, val, cb) {
  const dep = new Dep()
  Object.defineProperty(obj, key, {
    // 省略
  })
}
```

另外我们还要用Dep.target来区分进入get的是不是依赖收集的get。

最后po上全部代码。

```javascript
function VNode(tag, data, children, text) {
  return {
    tag: tag,
    data: data,
    children: children,
    text: text
  }
}

class Vue {
  constructor(options) {
    this.$options = options
    this._data = options.data
    Object.keys(options.data).forEach(key => this._proxy(key))
    observer(options.data)
    const vdom = watch(this, this._render.bind(this), this._update.bind(this))
    console.log(vdom)
  }
  _proxy(key) {
    const self = this
    Object.defineProperty(self, key, {
      configurable: true,
      enumerable: true,
      get: function proxyGetter() {
        return self._data[key]
      },
      set: function proxySetter(val) {
        self._data[key] = val
      }
    })
  }
  _update() {
    console.log("我需要更新");
    const vdom = this._render.call(this)
    console.log(vdom);
  }
  _render() {
    return this.$options.render.call(this)
  }
  __h__(tag, attr, children) {
    return VNode(tag, attr, children.map((child) => {
      if (typeof child === 'string') {
        return VNode(undefined, undefined, undefined, child)
      } else {
        return child
      }
    }))
  }
  __toString__(val) {
    return val == null ? '' : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
  }
}

function observer(obj) {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'object') {
      new observer(obj[key])
    }
    defineReactive(obj, key, obj[key])
  })
}

function defineReactive(obj, key, val) {
  const dep = new Dep()
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: () => {
      if (Dep.target) {
        dep.add(Dep.target)
        Dep.target = null
      }
      console.log('你访问了' + key)
      return val
    },
    set: newVal => {
      if (newVal === val)
        return
      console.log('你设置了' + key)
      console.log('新的' + key + ' = ' + newVal)
      val = newVal
      dep.notify()
    }
  })
}

function watch(vm, exp, cb) {
  Dep.target = cb
  return exp()
}

class Dep {
  constructor() {
    this.subs = []
  }
  add(cb) {
    this.subs.push(cb)
  }
  notify() {
    this.subs.forEach((cb) => cb())
  }
}
Dep.target = null


var demo = new Vue({
  el: '#demo',
  data: {
    text: "before",
    test: {
      a: '1'
    },
    t: 1
  },
  render() {
    return this.__h__('div', {}, [
      this.__h__('span', {}, [this.__toString__(this.text)]),
      this.__h__('span', {}, [this.__toString__(this.test.a)])
    ])
  }
})
```

#### React

我们知道，react的state变化需要借助setState，在setState后再利用virtual dom，虚拟dom差异化算法（diff algorithm）更新元素元素和节点，实现更新机制。下面我们来具体讨论关于自定义元素的整个更新机制的流程。

##### react自定义元素通过receiveComponent实现更新的机制

如下为我们使用setState的具体场景。当我们点击文字的时候就会出发更新事件。

```javascript
var HelloMessage = React.createClass({
  getInitialState: function() {
    return {type: 'say:'};
  },
  changeType:function(){
    this.setState({type:'shout:'})
  },
  render: function() {
    return React.createElement("div", {onclick:this.changeType},this.state.type, "Hello ", this.props.name);
  }
});


React.render(React.createElement(HelloMessage, {name: "John"}), document.getElementById("container"));
```

我们首先来定义一个ReactClass类。我们可以看到调用setState会出发receiveComponent方法。所有的挂载，更新都应该交给对应的component来管理。

```javascript
//定义ReactClass类
var ReactClass = function(){
}

ReactClass.prototype.render = function(){}

//setState
ReactClass.prototype.setState = function(newState) {
    this._reactInternalInstance.receiveComponent(null, newState);
}
```

接下来我们来具体实现这个类。首先，我们合并改动，用改动后最新的state，props与改动前对比。如果shouldComponentsUpdate为true，我们真正开始更新。然后判断新的属性与原来差的多不多，多的话就直接用新的渲染就好了，不多的话就更新element。如果要更新就继续调用对应的component类对应的receiveComponent，本质上还是递归调用receiveComponent的过程。

```javascript
//更新
ReactCompositeComponent.prototype.receiveComponent = function(nextElement, newState) {

    //如果接受了新的，就使用最新的element
    this._currentElement = nextElement || this._currentElement

    var inst = this._instance;
    //合并state
    var nextState = $.extend(inst.state, newState);
    var nextProps = this._currentElement.props;


    //改写state
    inst.state = nextState;


    //如果inst有shouldComponentUpdate并且返回false。说明组件本身判断不要更新，就直接返回。
    if (inst.shouldComponentUpdate && (inst.shouldComponentUpdate(nextProps, nextState) === false)) return;

    //生命周期管理，如果有componentWillUpdate，就调用，表示开始要更新了。
    if (inst.componentWillUpdate) inst.componentWillUpdate(nextProps, nextState);


    var prevComponentInstance = this._renderedComponent;
    var prevRenderedElement = prevComponentInstance._currentElement;
    //重新执行render拿到对应的新element;
    var nextRenderedElement = this._instance.render();


    //判断是需要更新还是直接就重新渲染
    //注意这里的_shouldUpdateReactComponent跟上面的不同哦 这个是全局的方法
    if (_shouldUpdateReactComponent(prevRenderedElement, nextRenderedElement)) {
        //如果需要更新，就继续调用子节点的receiveComponent的方法，传入新的element更新子节点。
        prevComponentInstance.receiveComponent(nextRenderedElement);
        //调用componentDidUpdate表示更新完成了
        inst.componentDidUpdate && inst.componentDidUpdate();

    } else {
        //如果发现完全是不同的两种element，那就干脆重新渲染了
        var thisID = this._rootNodeID;
        //重新new一个对应的component，
        this._renderedComponent = this._instantiateReactComponent(nextRenderedElement);
        //重新生成对应的元素内容
        var nextMarkup = _renderedComponent.mountComponent(thisID);
        //替换整个节点
        $('[data-reactid="' + this._rootNodeID + '"]').replaceWith(nextMarkup);

    }

}

//用来判定两个element需不需要更新
//这里的key是我们createElement的时候可以选择性的传入的。用来标识这个element，当发现key不同时，我们就可以直接重新渲染，不需要去更新了。
var _shouldUpdateReactComponent ＝ function(prevElement, nextElement){
    if (prevElement != null && nextElement != null) {
    var prevType = typeof prevElement;
    var nextType = typeof nextElement;
    if (prevType === 'string' || prevType === 'number') {
      return nextType === 'string' || nextType === 'number';
    } else {
      return nextType === 'object' && prevElement.type === nextElement.type && prevElement.key === nextElement.key;
    }
  }
  return false;
}
```

其实这种更新方式与dom节点的diff算法一致，高效的更新渲染组件。

##### react的dom元素使用receiveComponent更新的实现

说到这里我们必须要聊一聊diff算法的实现。

想一下我们怎么以最小代价去更新这段html呢。不难发现其实主要包括两个部分：

1. 属性的更新，包括对特殊属性比如事件的处理
2. 子节点的更新,这个比较复杂，为了得到最好的效率，我们需要处理下面这些问题：
   - 拿新的子节点树跟以前老的子节点树对比，找出他们之间的差别。我们称之为diff
   - 所有差别找出后，再一次性的去更新。我们称之为patch

所以我们定义receiveComponent方法如下

```javascript
ReactDOMComponent.prototype.receiveComponent = function(nextElement) {
    var lastProps = this._currentElement.props;
    var nextProps = nextElement.props;

    this._currentElement = nextElement;
    //需要单独的更新属性
    this._updateDOMProperties(lastProps, nextProps);
    //再更新子节点
    this._updateDOMChildren(nextElement.props.children);
}
```

首先是属性的变更。只需要把过时的删掉，添加上新的属性就好。要注意对于特殊事件的属性作出特殊处理。

```javascript
ReactDOMComponent.prototype._updateDOMProperties = function(lastProps, nextProps) {
    var propKey;
    //遍历，当一个老的属性不在新的属性集合里时，需要删除掉。

    for (propKey in lastProps) {
        //新的属性里有，或者propKey是在原型上的直接跳过。这样剩下的都是不在新属性集合里的。需要删除
        if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
            continue;
        }
        //对于那种特殊的，比如这里的事件监听的属性我们需要去掉监听
        if (/^on[A-Za-z]/.test(propKey)) {
            var eventType = propKey.replace('on', '');
            //针对当前的节点取消事件代理
            $(document).undelegate('[data-reactid="' + this._rootNodeID + '"]', eventType, lastProps[propKey]);
            continue;
        }

        //从dom上删除不需要的属性
        $('[data-reactid="' + this._rootNodeID + '"]').removeAttr(propKey)
    }

    //对于新的属性，需要写到dom节点上
    for (propKey in nextProps) {
        //对于事件监听的属性我们需要特殊处理
        if (/^on[A-Za-z]/.test(propKey)) {
            var eventType = propKey.replace('on', '');
            //以前如果已经有，说明有了监听，需要先去掉
            lastProps[propKey] && $(document).undelegate('[data-reactid="' + this._rootNodeID + '"]', eventType, lastProps[propKey]);
            //针对当前的节点添加事件代理,以_rootNodeID为命名空间
            $(document).delegate('[data-reactid="' + this._rootNodeID + '"]', eventType + '.' + this._rootNodeID, nextProps[propKey]);
            continue;
        }

        if (propKey == 'children') continue;

        //添加新的属性，或者是更新老的同名属性
        $('[data-reactid="' + this._rootNodeID + '"]').prop(propKey, nextProps[propKey])
    }

}
```

接下来是最核心的部分，关于dom节点的更新。把大象装进冰箱无非两部，找到差异（diff），更新（patch）

```javascript
ReactDOMComponent.prototype.receiveComponent = function(nextElement){
    var lastProps = this._currentElement.props;
    var nextProps = nextElement.props;

    this._currentElement = nextElement;
    //需要单独的更新属性
    this._updateDOMProperties(lastProps,nextProps);
    //再更新子节点
    this._updateDOMChildren(nextProps.children);
}

//全局的更新深度标识
var updateDepth = 0;
//全局的更新队列，所有的差异都存在这里
var diffQueue = [];

ReactDOMComponent.prototype._updateDOMChildren = function(nextChildrenElements){
    updateDepth++
    //_diff用来递归找出差别,组装差异对象,添加到更新队列diffQueue。
    this._diff(diffQueue,nextChildrenElements);
    updateDepth--
    if(updateDepth == 0){
        //在需要的时候调用patch，执行具体的dom操作
        this._patch(diffQueue);
        diffQueue = [];
    }
}
```

`_diff`内部也会递归调用子节点的receiveComponent于是当某个子节点也是浏览器普通节点，就也会走_updateDOMChildren这一步。所以这里使用了updateDepth来记录递归的过程，只有等递归回来updateDepth为0时，代表整个差异已经分析完毕，可以开始使用patch来处理差异队列了。

首先我们先来看diff的实现

```javascript
//差异更新的几种类型
var UPATE_TYPES = {
    MOVE_EXISTING: 1,
    REMOVE_NODE: 2,
    INSERT_MARKUP: 3
}


//普通的children是一个数组，此方法把它转换成一个map,key就是element的key,如果是text节点或者element创建时并没有传入key,就直接用在数组里的index标识
function flattenChildren(componentChildren) {
    var child;
    var name;
    var childrenMap = {};
    for (var i = 0; i < componentChildren.length; i++) {
        child = componentChildren[i];
        name = child && child._currentelement && child._currentelement.key ? child._currentelement.key : i.toString(36);
        childrenMap[name] = child;
    }
    return childrenMap;
}


//主要用来生成子节点elements的component集合
//这边注意，有个判断逻辑，如果发现是更新，就会继续使用以前的componentInstance,调用对应的receiveComponent。
//如果是新的节点，就会重新生成一个新的componentInstance，
function generateComponentChildren(prevChildren, nextChildrenElements) {
    var nextChildren = {};
    nextChildrenElements = nextChildrenElements || [];
    $.each(nextChildrenElements, function(index, element) {
        var name = element.key ? element.key : index;
        var prevChild = prevChildren && prevChildren[name];
        var prevElement = prevChild && prevChild._currentElement;
        var nextElement = element;

        //调用_shouldUpdateReactComponent判断是否是更新
        if (_shouldUpdateReactComponent(prevElement, nextElement)) {
            //更新的话直接递归调用子节点的receiveComponent就好了
            prevChild.receiveComponent(nextElement);
            //然后继续使用老的component
            nextChildren[name] = prevChild;
        } else {
            //对于没有老的，那就重新新增一个，重新生成一个component
            var nextChildInstance = instantiateReactComponent(nextElement, null);
            //使用新的component
            nextChildren[name] = nextChildInstance;
        }
    })

    return nextChildren;
}



//_diff用来递归找出差别,组装差异对象,添加到更新队列diffQueue。
ReactDOMComponent.prototype._diff = function(diffQueue, nextChildrenElements) {
  var self = this;
  //拿到之前的子节点的 component类型对象的集合,这个是在刚开始渲染时赋值的，记不得的可以翻上面
  //_renderedChildren 本来是数组，我们搞成map
  var prevChildren = flattenChildren(self._renderedChildren);
  //生成新的子节点的component对象集合，这里注意，会复用老的component对象
  var nextChildren = generateComponentChildren(prevChildren, nextChildrenElements);
  //重新赋值_renderedChildren，使用最新的。
  self._renderedChildren = []
  $.each(nextChildren, function(key, instance) {
    self._renderedChildren.push(instance);
  })


  var nextIndex = 0; //代表到达的新的节点的index
  //通过对比两个集合的差异，组装差异节点添加到队列中
  for (name in nextChildren) {
    if (!nextChildren.hasOwnProperty(name)) {
      continue;
    }
    var prevChild = prevChildren && prevChildren[name];
    var nextChild = nextChildren[name];
    //相同的话，说明是使用的同一个component,所以我们需要做移动的操作
    if (prevChild === nextChild) {
      //添加差异对象，类型：MOVE_EXISTING
      diffQueue.push({
        parentId: self._rootNodeID,
        parentNode: $('[data-reactid=' + self._rootNodeID + ']'),
        type: UPATE_TYPES.MOVE_EXISTING,
        fromIndex: prevChild._mountIndex,
        toIndex: nextIndex
      })
    } else { //如果不相同，说明是新增加的节点
      //但是如果老的还存在，就是element不同，但是component一样。我们需要把它对应的老的element删除。
      if (prevChild) {
        //添加差异对象，类型：REMOVE_NODE
        diffQueue.push({
          parentId: self._rootNodeID,
          parentNode: $('[data-reactid=' + self._rootNodeID + ']'),
          type: UPATE_TYPES.REMOVE_NODE,
          fromIndex: prevChild._mountIndex,
          toIndex: null
        })

        //如果以前已经渲染过了，记得先去掉以前所有的事件监听，通过命名空间全部清空
        if (prevChild._rootNodeID) {
            $(document).undelegate('.' + prevChild._rootNodeID);
        }

      }
      //新增加的节点，也组装差异对象放到队列里
      //添加差异对象，类型：INSERT_MARKUP
      diffQueue.push({
        parentId: self._rootNodeID,
        parentNode: $('[data-reactid=' + self._rootNodeID + ']'),
        type: UPATE_TYPES.INSERT_MARKUP,
        fromIndex: null,
        toIndex: nextIndex,
        markup: nextChild.mountComponent() //新增的节点，多一个此属性，表示新节点的dom内容
      })
    }
    //更新mount的index
    nextChild._mountIndex = nextIndex;
    nextIndex++;
  }



  //对于老的节点里有，新的节点里没有的那些，也全都删除掉
  for (name in prevChildren) {
    if (prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))) {
      //添加差异对象，类型：REMOVE_NODE
      diffQueue.push({
        parentId: self._rootNodeID,
        parentNode: $('[data-reactid=' + self._rootNodeID + ']'),
        type: UPATE_TYPES.REMOVE_NODE,
        fromIndex: prevChild._mountIndex,
        toIndex: null
      })
      //如果以前已经渲染过了，记得先去掉以前所有的事件监听
      if (prevChildren[name]._rootNodeID) {
        $(document).undelegate('.' + prevChildren[name]._rootNodeID);
      }
    }
  }
}
```

大概就做了如下几件事，首先component用来放element，把数组转成了对象map，用 key作为每个element的标识，递归的根据key查找看能复用，然后根据前后节点的不同分为这么几个情况，这几个情况分别处理。

| 类型            | 情况                                       |
| ------------- | ---------------------------------------- |
| MOVE_EXISTING | 新的component类型在老的集合里也有，并且element是可以更新的类型，在generateComponentChildren我们已经调用了receiveComponent，这种情况下prevChild=nextChild,那我们就需要做出移动的操作，可以复用以前的dom节点。 |
| INSERT_MARKUP | 新的component类型不在老的集合里，那么就是全新的节点，我们需要插入新的节点 |
| REMOVE_NODE   | 老的component类型，在新的集合里也有，但是对应的element不同了不能直接复用直接更新，那我们也得删除。 |
| REMOVE_NODE   | 老的component不在新的集合里的，我们需要删除               |

接下来我们一起来处理patch的实现。`_patch`主要就是挨个遍历差异队列，遍历两次，第一次删除掉所有需要变动的节点，然后第二次插入新的节点还有修改的节点。这里为什么可以直接挨个的插入呢？原因就是我们在diff阶段添加差异节点到差异队列时，本身就是有序的，也就是说对于新增节点（包括move和insert的）在队列里的顺序就是最终dom的顺序，所以我们才可以挨个的直接根据index去塞入节点。

```javascript
//用于将childNode插入到指定位置
function insertChildAt(parentNode, childNode, index) {
    var beforeChild = parentNode.children().get(index);
    beforeChild ? childNode.insertBefore(beforeChild) : childNode.appendTo(parentNode);
}

ReactDOMComponent.prototype._patch = function(updates) {
    var update;
    var initialChildren = {};
    var deleteChildren = [];
    for (var i = 0; i < updates.length; i++) {
        update = updates[i];
        if (update.type === UPATE_TYPES.MOVE_EXISTING || update.type === UPATE_TYPES.REMOVE_NODE) {
            var updatedIndex = update.fromIndex;
            var updatedChild = $(update.parentNode.children().get(updatedIndex));
            var parentID = update.parentID;

            //所有需要更新的节点都保存下来，方便后面使用
            initialChildren[parentID] = initialChildren[parentID] || [];
            //使用parentID作为简易命名空间
            initialChildren[parentID][updatedIndex] = updatedChild;


            //所有需要修改的节点先删除,对于move的，后面再重新插入到正确的位置即可
            deleteChildren.push(updatedChild)
        }

    }

    //删除所有需要先删除的
    $.each(deleteChildren, function(index, child) {
        $(child).remove();
    })


    //再遍历一次，这次处理新增的节点，还有修改的节点这里也要重新插入
    for (var k = 0; k < updates.length; k++) {
        update = updates[k];
        switch (update.type) {
            case UPATE_TYPES.INSERT_MARKUP:
                insertChildAt(update.parentNode, $(update.markup), update.toIndex);
                break;
            case UPATE_TYPES.MOVE_EXISTING:
                insertChildAt(update.parentNode, initialChildren[update.parentID][update.fromIndex], update.toIndex);
                break;
            case UPATE_TYPES.REMOVE_NODE:
                // 什么都不需要做，因为上面已经帮忙删除掉了
                break;
        }
    }
}
```

这样整个的更新机制就完成了。我们再来简单回顾下reactjs的差异算法：

首先是所有的component都实现了receiveComponent来负责自己的更新，而浏览器默认元素的更新最为复杂，也就是经常说的 diff algorithm。

react有一个全局_shouldUpdateReactComponent用来根据element的key来判断是更新还是重新渲染，这是第一个差异判断。比如自定义元素里，就使用这个判断，通过这种标识判断，会变得特别高效。

每个类型的元素都要处理好自己的更新：

1. 自定义元素的更新，主要是更新render出的节点，做甩手掌柜交给render出的节点的对应component去管理更新。
2. text节点的更新很简单，直接更新文案。
3. 浏览器基本元素的更新，分为两块：
   - 先是更新属性，对比出前后属性的不同，局部更新。并且处理特殊属性，比如事件绑定。
   - 然后是子节点的更新，子节点更新主要是找出差异对象，找差异对象的时候也会使用上面的_shouldUpdateReactComponent来判断，如果是可以直接更新的就会递归调用子节点的更新，这样也会递归查找差异对象，这里还会使用lastIndex这种做一种优化，使一些节点保留位置，之后根据差异对象操作dom元素（位置变动，删除，添加等）。

整个reactjs的差异算法就是这个样子。最核心的两个_shouldUpdateReactComponent以及diff,patch算法。



#### San

san框架只允许使用set修改数据（下文会说到）。我们一起来看一看源码中关于数据部分的实现。

首先我们可以看到如何自定义一个监听事件。

```javascript
Data.prototype.listen = function (listener) {
    if (typeof listener === 'function') {
        this.listeners.push(listener);
    }
};


Data.prototype.unlisten = function (listener) {
    var len = this.listeners.length;
    while (len--) {
        if (!listener || this.listeners[len] === listener) {
            this.listeners.splice(len, 1);
        }
    }

```

我们可以看到首先实现了一个监听listen。大概思路是这样的，如果想要监听事件，首先把事件触发的函数存入数组中。然后如果有事件发生，遍历数组找到对应的函数，执行。

```javascript
Component.prototype.on = function (name, listener, declaration) {
    if (typeof listener === 'function') {
        if (!this.listeners[name]) {
            this.listeners[name] = [];
        }
        this.listeners[name].push({fn: listener, declaration: declaration});
    }
};

Component.prototype.un = function (name, listener) {
    var nameListeners = this.listeners[name];
    var len = nameListeners && nameListeners.length;

    while (len--) {
        if (!listener || listener === nameListeners[len].fn) {
            nameListeners.splice(len, 1);
        }
    }
};

Component.prototype.fire = function (name, event) {
    each(this.listeners[name], function (listener) {
        listener.fn.call(this, event);
    }, this);
};
```

然后我们便可以实现一个watch监听。实现思路也很简单，要watch哪个就给绑定一个监听。

```javascript
Component.prototype.fire = function (name, event) {
    each(this.listeners[name], function (listener) {
        listener.fn.call(this, event);
    }, this);
};
```

 然后我们在data.js文件中可以看到，改写了set，get，数组操作等一系列方法。

```javascript
Data.prototype.set = function (expr, value, option) {
    option = option || {};

    // #[begin] error
    var exprRaw = expr;
    // #[end]

    expr = parseExpr(expr);

    // #[begin] error
    if (expr.type !== ExprType.ACCESSOR) {
        throw new Error('[SAN ERROR] Invalid Expression in Data set: ' + exprRaw);
    }
    // #[end]

    if (this.get(expr) === value) {
        return;
    }

    this.raw = immutableSet(this.raw, expr.paths, value, this);
    !option.silence && this.fire({
        type: DataChangeType.SET,
        expr: expr,
        value: value,
        option: option
    });

    // #[begin] error
    this.checkDataTypes();
    // #[end]

};

Data.prototype.pop = function (expr, option) {
    var target = this.get(expr);

    if (target instanceof Array) {
        var len = target.length;
        if (len) {
            return this.splice(expr, [len - 1, 1], option)[0];
        }
    }
};
```

另外，从下文我们可以看到，只允许set方法来操作数据。

```javascript
Component.prototype._dataChanger = function (change) {
    var len = this.dataChanges.length;

    if (!len) {
        nextTick(this.updateView, this);
    }

    while (len--) {
        switch (changeExprCompare(change.expr, this.dataChanges[len].expr)) {
            case 1:
            case 2:
                if (change.type === DataChangeType.SET) {//只有set方法可以操作数据
                    this.dataChanges.splice(len, 1);
                }
        }
    }

    this.dataChanges.push(change);
};
```

我们再一起来看因为数据变化更新视图函数

```javascript
Component.prototype.updateView = function (changes) {
    if (this.lifeCycle.is('disposed')) {
        return;
    }

    var me = this;

    each(changes, function (change) {
        var changeExpr = change.expr;

        me.binds.each(function (bindItem) {
            var relation;
            var setExpr = bindItem.name;
            var updateExpr = bindItem.expr;

            if (!isDataChangeByElement(change, me, setExpr)
                && (relation = changeExprCompare(changeExpr, updateExpr, me.scope))
            ) {
                if (relation > 2) {
                    setExpr = {
                        type: ExprType.ACCESSOR,
                        paths: [{
                            type: ExprType.STRING,
                            value: setExpr
                        }].concat(changeExpr.paths.slice(updateExpr.paths.length))
                    };
                    updateExpr = changeExpr;
                }

                me.data.set(setExpr, me.evalExpr(updateExpr), {
                    target: {
                        id: me.owner.id
                    }
                });
            }
        });
    });

    each(this.slotChilds, function (child) {
        Element.prototype.updateChilds.call(child, changes);
    });


    var dataChanges = me.dataChanges;
    if (dataChanges.length) {
        me.dataChanges = [];
        me.props.each(function (prop) {
            each(dataChanges, function (change) {
                if (changeExprCompare(change.expr, prop.expr, me.data)) {
                    me.setProp(
                        prop.name,
                        evalExpr(prop.expr, me.data, me)
                    );

                    return false;
                }
            });
        });

        this.updateChilds(dataChanges, 'ownSlotChilds');

        this._toPhase('updated');

        if (me.owner) {
            each(dataChanges, function (change) {
                me.binds.each(function (bindItem) {
                    var changeExpr = change.expr;
                    if (bindItem.x
                        && !isDataChangeByElement(change, me.owner)
                        && changeExprCompare(changeExpr, parseExpr(bindItem.name), me.data)
                    ) {
                        var updateScopeExpr = bindItem.expr;
                        if (changeExpr.paths.length > 1) {
                            updateScopeExpr = {
                                type: ExprType.ACCESSOR,
                                paths: bindItem.expr.paths.concat(changeExpr.paths.slice(1))
                            };
                        }

                        me.scope.set(
                            updateScopeExpr,
                            evalExpr(changeExpr, me.data, me),
                            {
                                target: {
                                    id: me.id,
                                    prop: bindItem.name
                                }
                            }
                        );
                    }
                });
            });

            me.owner.updateView();
        }

    }
};
```





#### 扩展—关于virtual dom

![vdom](/Users/centmaster/Downloads/vdom.png)

如上图为一次更新节点的过程。render—>createElement—>diff—>patch

 生成vdom—>基于vdom生成真正dom—>遍历差异对比—>sort一下，按顺序更新



