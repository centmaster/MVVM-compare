## React更新机制

##### Virtual DOM

DOM元素非常庞大，具有复杂的属性，牵一发而动全身。通过JavaScript来模拟DOM树的结构，加快响应时间

1. 建立虚拟DOM树：用JavaScript对象记录节点类型、属性、子节点。通过递归该虚拟DOM建立真正的DOM树

2. diff算法：因为跨层DOM操作很少，只比较同层DOM，从而将O(n^3)的比较降低到O(n)复杂度，深度优先遍历，记录差异：

   - 替换节点类型： div -> p
   - 增、删、调换子节点
   - 修改节点属性
   - 修改文本内容

   记录差异类型，差异内容，压入patch数组

3. 根据patch数组，对真实DOM进行操作。



##### diff算法自我理解

1.忽略跨层级操作								tree diff

2.拥有相同类的组件拥有相似的树结构			component diff

3.同一个层级之间的节点通过key进行优化			element diff



###### tree diff 

同一个层级之间更改，不同层级就直接删除

###### component diff

同一类型的组件比较，不同类型直接替换。 允许shouldcomponentupdate自己要求是否更新

###### element diff

每个element都有自己的key。遍历过程中还有个lastindex表示遍历过的节点中在老节点位置中最右的index。

然后新节点便利，如果在老节点中index比lastindex小，挪动。新出来的节点的话加上去。如果index比lastindex大，不动。最后再遍历一遍老节点，删除已经没有的老节点。

说白了：新节点位置已经比左边的新节点位置靠右了，如果在老节点中比你靠左，那就说明得挪嘛。







##### 更新机制

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

