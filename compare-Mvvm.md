## 来看三个小demo

##### vue:<https://centmaster.github.io/MVVM-compare/show/vue/>

打开控制台，我们可以看到效果。其中unusedcount改变了father中对象的数据，但数据没有关联到视图上，所以页面没有被再次渲染。也可以看到父子节点之间的渲染各自独立。

##### react:<https://centmaster.github.io/MVVM-compare/show/react/>

对比vue，我们可以看到，react中父节点的渲染会出发子节点的渲染，而完全没有用到的数据改变也会使得页面渲染。子节点child2由于添加的shoudcomponentupdate为false，不会被渲染。

##### San:<https://centmaster.github.io/MVVM-compare/san-test/>

san中，我们可以看到，虽然san的数据操作与react更像 ，但也是精准渲染。（ps：这里我们没有使用双向数据绑定）



#### vue和react的区别

##### 共同点

都是组件化

提供合理的钩子函数

ajax，route等功能都不在核心包里，而是以插件的方式加载

使用 Virtual DOM 

react通过props父向子传，vue也可以用模版语法传

##### 区别

模版 vs JSX

React中，不能直接改变state，需要用setState更新。Vue中数据由data进行管理可以自己操作更改state

当组件状态发生变化的时候，react树会自上而下发生变化。需要通过shouldComponentUpdate方法避免某些组件渲染，然而这个时候也要保证props是这个子组件根。vue的渲染是自动追踪的。

vue有scope 自己的css作用域，相互之间不影响

状态变化跟踪，界面同步

- react 可以随时添加新的 state 成员；vue 不行，必须定义时准备好顶级成员，而且非顶级成员也必须通过api设置才能是响应式的；这点，react 比较方便 
- vue 可以跟踪任何 scope 的状态，包括各级父甚至不相关的，因为vue采用 getter/setter机制；react 默认只能检测本组件的状态变化，比较受限制 

以 javascript 为核心，和以 html 为核心

- react 是状态到 html 的映射 
- vue 是现有 HTML 模板，然后绑定到对应的 Vue javascript 对象上 

组件化比较

- react 倾向于细粒度的组件划分，确实也容易做到 
- vue 相对不太，但是如果 Vue 也采用 jsx 语法，那么还是比较容易做到的 

directive

vue 由于提供的 direct 特别是预置的 directive 因为场景场景开发更容易；react 没有 directive 

- v-if, v-show, v-else 
- v-text, v-html, 
- v-model 对于表单处理 vue 明显更方便 
- @event.prevent @keyxxx.enter 

watch

- vue 可以 watch 一个数据项；而 react 不行 

计算属性

- vue 有，提供方便；而 react 不行 



