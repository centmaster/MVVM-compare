#### vue1利用DocumentFragment渲染

_compile 部分分为三步 transclude  compile	link

1. transclude
   transclude的意思是内嵌，这个步骤会把你template里给出的模板转换成一段dom，然后抽取出你el选项指定的dom里的内容（即子元素，因为模板里可能有slot），把这段模板dom嵌入到el里面去，当然，如果replace为true，那他就是直接替换el，而不是内嵌。我们大概明白transclude这个名字的意义了，但其实更关键的是把template转换为dom的过程（如`<p>{{a}}<p>`字符串转为真正的段落元素），这里为后面的编译准备好了dom。

   说白了就是把字符串转换成dom

2. compile
   compile的的过程具体就是**遍历模板解析出模板里的指令**。更精确的说是解析后生成了指令描述对象。
   同时，compile函数是一个高阶函数，他执行完成之后的返回值是另一个函数：link，所以compile函数的第一个阶段是编译，返回出去的这个函数完成另一个阶段：link。

3. link
   compile阶段将指令解析成为指令描述对象(descriptor)，闭包在了link函数里，link函数会把descriptor传入Directive构造函数，创建出真正的指令实例。此外link函数是作为参数传入linkAndCaptrue中的，后者负责执行link，同时取出这些新生成的指令，先按照指令的预置的优先级从高到低排好顺序，然后遍历指令执行指令的_bind方法，这个方法会为指令创建watcher，并计算表达式的值，完成前面描述的依赖收集。并最后执行对应指令的bind和update方法，使指令生效、界面更新。

为什么dom的编译要分成compile和link两个phase。

在组件的多个实例、v-for数组等场合，我们会出现同一个段模板要绑定不同的数据然后分发到dom里面去的需求。这也是mvvm性能考量的主要场景：大数据量的重复渲染生成。而重复渲染的模板是一致的，不一致的是他们需要绑定的数据，因此compile阶段找出指令的过程是不用重复计算的，只需要link函数（和里面闭包的指令)，而模板生成的dom使用原生的cloneNode方法即可复制出一份新的dom。现在，复制出的新dom+ link+具体的数据即可完成渲染，所以分离compile、并缓存link使得Vue在渲染时避免大量重复的性能消耗。



#### vue2虚拟dom的解析

和react几乎一样

`Vue`在`2.0`版本也引入了`vdom`。其`vdom`算法是基于[snabbdom算法](https://github.com/snabbdom/snabbdom)所做的修改。

Render—>createElement—>diff—>patch

这是vdom的流程，让我看看每一步都做了什么

##### 首先是vnode的定义

```javascript
constructor (
    tag?: string,
    data?: VNodeData,         // 关于这个节点的data值，包括attrs,style,hook等
    children?: ?Array<VNode>, // 子vdom节点
    text?: string,        // 文本内容
    elm?: Node,           // 真实的dom节点
    context?: Component,  // 创建这个vdom的上下文
    componentOptions?: VNodeComponentOptions
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.functionalContext = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child (): Component | void {
    return this.componentInstance
  }
}
```

每一个`vnode`都映射到一个真实的`dom`节点上。其中几个比较重要的属性:

- `tag` 属性即这个`vnode`的标签属性
- `data` 属性包含了最后渲染成真实`dom`节点后，节点上的`class`,`attribute`,`style`以及绑定的事件
- `children` 属性是`vnode`的子节点
- `text` 属性是文本属性
- `elm` 属性为这个`vnode`对应的真实`dom`节点
- `key` 属性是`vnode`的标记，在`diff`过程中可以提高`diff`的效率，后文有讲解

**在当oldVnode不存在的时候**，这个时候是`root节点`初始化的过程，因此调用了`createElm(vnode, insertedVnodeQueue, parentElm, refElm)`方法去创建一个新的节点。**而当oldVnode是vnode且sameVnode(oldVnode, vnode)2个节点的基本属性相同**，那么就进入了2个节点的`diff`过程。

##### diff过程

```javascript
const elm = vnode.elm = oldVnode.elm
    const oldCh = oldVnode.children
    const ch = vnode.children
    // 如果vnode没有文本节点
    if (isUndef(vnode.text)) {
      // 如果oldVnode的children属性存在且vnode的属性也存在
      if (isDef(oldCh) && isDef(ch)) {
        // updateChildren，对子节点进行diff
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
      } else if (isDef(ch)) {
        // 如果oldVnode的text存在，那么首先清空text的内容
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        // 然后将vnode的children添加进去
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        // 删除elm下的oldchildren
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        // oldVnode有子节点，而vnode没有，那么就清空这个节点
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      // 如果oldVnode和vnode文本属性不同，那么直接更新真是dom节点的文本元素
      nodeOps.setTextContent(elm, vnode.text)
    }
```

这其中的`diff`过程中又分了好几种情况，`oldCh`为`oldVnode`的子节点，`ch`为`Vnode`的子节点：

1. 首先进行文本节点的判断，若`oldVnode.text !== vnode.text`，那么就会直接进行文本节点的替换；
2. 在`vnode`没有文本节点的情况下，进入子节点的`diff`；
3. 当`oldCh`和`ch`都存在且不相同的情况下，调用`updateChildren`对子节点进行`diff`；
4. 若`oldCh`不存在，`ch`存在，首先清空`oldVnode`的文本节点，同时调用`addVnodes`方法将`ch`添加到`elm`真实`dom`节点当中；
5. 若`oldCh`存在，`ch`不存在，则删除`elm`真实节点下的`oldCh`子节点；
6. 若`oldVnode`有文本节点，而`vnode`没有，那么就清空这个文本节点。

其中其他的都比较容易理解，我们要着重看一眼第三步的细节，也就是updateChildren过程

```javascript
function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    // 为oldCh和newCh分别建立索引，为之后遍历的依据
    let oldStartIdx = 0
    let newStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx, idxInOld, elmToMove, refElm
    
    // 直到oldCh或者newCh被遍历完后跳出循环
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
        // 插入到老的开始节点的前面
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        // 如果以上条件都不满足，那么这个时候开始比较key值，首先建立key和index索引的对应关系
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        idxInOld = isDef(newStartVnode.key) ? oldKeyToIdx[newStartVnode.key] : null
        // 如果idxInOld不存在
        // 1. newStartVnode上存在这个key,但是oldKeyToIdx中不存在
        // 2. newStartVnode上并没有设置key属性
        if (isUndef(idxInOld)) { // New element
          // 创建新的dom节点
          // 插入到oldStartVnode.elm前面
          // 参见createElm方法
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm)
          newStartVnode = newCh[++newStartIdx]
        } else {
          elmToMove = oldCh[idxInOld]
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !elmToMove) {
            warn(
              'It seems there are duplicate keys that is causing an update error. ' +
              'Make sure each v-for item has a unique key.'
            )
          
          // 将找到的key一致的oldVnode再和newStartVnode进行diff
          if (sameVnode(elmToMove, newStartVnode)) {
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
            oldCh[idxInOld] = undefined
            // 移动node节点
            canMove && nodeOps.insertBefore(parentElm, newStartVnode.elm, oldStartVnode.elm)
            newStartVnode = newCh[++newStartIdx]
          } else {
            // same key but different element. treat as new element
            // 创建新的dom节点
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm)
            newStartVnode = newCh[++newStartIdx]
          }
        }
      }
    }
    // 如果最后遍历的oldStartIdx大于oldEndIdx的话
    if (oldStartIdx > oldEndIdx) {        // 如果是老的vdom先被遍历完
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      // 添加newVnode中剩余的节点到parentElm中
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) { // 如果是新的vdom先被遍历完，则删除oldVnode里面所有的节点
      // 删除剩余的节点
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
}
```

不带key标签的话，遍历完一遍以后有多余的就直接把节点删了。（不推荐，不细说）

在`vnode`不带`key`的情况下，每一轮的`diff`过程当中都是`起始`和`结束`节点进行比较，直到`oldCh`或者`newCh`被遍历完。而当为`vnode`引入`key`属性后，在每一轮的`diff`过程中，当`起始`和`结束`节点都没有找到`sameVnode`时，首先对`oldCh`中进行`key`值与索引的映射:

```
if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
idxInOld = isDef(newStartVnode.key) ? oldKeyToIdx[newStartVnode.key] : null
```

`createKeyToOldIdx`([src/core/vdom/patch.js](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L61-L69))方法，用以将`oldCh`中的`key`属性作为`键`，而对应的节点的索引作为`值`。然后再判断在`newStartVnode`的属性中是否有`key`，且是否在`oldKeyToIndx`中找到对应的节点。

1. 如果不存在这个`key`，那么就将这个`newStartVnode`作为新的节点创建且插入到原有的`root`的子节点中:

```
if (isUndef(idxInOld)) { // New element
    // 创建新的dom节点
    // 插入到oldStartVnode.elm前面
    // 参见createElm方法
    createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm)
         newStartVnode = newCh[++newStartIdx]
    } 
```

1. 如果存在这个`key`，那么就取出`oldCh`中的存在这个`key`的`vnode`，然后再进行`diff`的过程:

```
       elmToMove = oldCh[idxInOld]
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !elmToMove) {
          
          // 将找到的key一致的oldVnode再和newStartVnode进行diff
          if (sameVnode(elmToMove, newStartVnode)) {
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
            // 清空这个节点
            oldCh[idxInOld] = undefined
            // 移动node节点
            canMove && nodeOps.insertBefore(parentElm, newStartVnode.elm, oldStartVnode.elm)
            newStartVnode = newCh[++newStartIdx]
          } else {
            // same key but different element. treat as new element
            // 创建新的dom节点
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm)
            newStartVnode = newCh[++newStartIdx]
          }
```

通过以上分析，给`vdom`上添加`key`属性后，遍历`diff`的过程中，当`起始点`, `结束点`的`搜寻`及`diff`出现还是无法匹配的情况下时，就会用`key`来作为唯一标识，来进行`diff`，这样就可以提高`diff`效率。

注意在第一轮的`diff`过后`oldCh`上的`B节点`被删除了，但是`newCh`上的`B节点`上`elm`属性保持对`oldCh`上`B节点`的`elm`引用。



##### patch

```javascript
  function patch (oldVnode, vnode, hydrating, removeOnly, parentElm, refElm) {
        // 当oldVnode不存在时
        if (isUndef(oldVnode)) {
            // 创建新的节点
            createElm(vnode, insertedVnodeQueue, parentElm, refElm)
        } else {
            const isRealElement = isDef(oldVnode.nodeType)
            if (!isRealElement && sameVnode(oldVnode, vnode)) {
            // patch existing root node
            // 对oldVnode和vnode进行diff，并对oldVnode打patch
            patchVnode(oldVnode, vnode, insertedVnodeQueue, removeOnly)
      } 
        }
    }
```

在对`oldVnode`和`vnode`类型判断中有个`sameVnode`方法，这个方法决定了是否需要对`oldVnode`和`vnode`进行`diff`及`patch`的过程。

```javascript
function sameVnode (a, b) {
  return (
    a.key === b.key &&
    a.tag === b.tag &&
    a.isComment === b.isComment &&
    isDef(a.data) === isDef(b.data) &&
    sameInputType(a, b)
  )
}
```

**sameVnode会对传入的2个vnode进行基本属性的比较，只有当基本属性相同的情况下才认为这个2个vnode只是局部发生了更新，然后才会对这2个vnode进行diff，如果2个vnode的基本属性存在不一致的情况，那么就会直接跳过diff的过程，进而依据vnode新建一个真实的dom，同时删除老的dom节点。**

