## 来看三个小demo

##### vue:<https://centmaster.github.io/MVVM-compare/show/vue/>

打开控制台，我们可以看到效果。其中unusedcount改变了father中对象的数据，但数据没有关联到视图上，所以页面没有被再次渲染。也可以看到父子节点之间的渲染各自独立。

##### react:<https://centmaster.github.io/MVVM-compare/show/react/>

对比vue，我们可以看到，react中父节点的渲染会出发子节点的渲染，而完全没有用到的数据改变也会使得页面渲染。子节点child2由于添加的shoudcomponentupdate为false，不会被渲染。

##### San:<https://centmaster.github.io/MVVM-compare/san-test/>

san中，我们可以看到，虽然san的数据操作与react更像 ，但也是精准渲染。（ps：这里我们没有使用双向数据绑定）





