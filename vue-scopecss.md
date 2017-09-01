#### vue中socpe css怎么实现的

(源码https://github.com/AlloyTeam/AlloyTouch/blob/2b9f8ca35ab954c3a9a3ebb747e88c09503a16fa/example/scoped_css/index.html)

每个域中的dom都会自己添加自定义的data-id的属性，然后css中添加[data-id]，会匹配这些dom

动态的把css变成.example[_v-f3f3eg9].  

1. 在同一组件内，你能同时用有作用域和无作用域的样式：
2. 父组件的有作用域的CSS和子组件的有作用域的CSS将同时影响子组件。
3. 有作用域的样式对其他部分没有影响。
4. **有作用域限定的样式不排除类的需要**. 由于浏览器渲染方式支持多种不同的CSS选择器，加了作用域的 `p { color: red }` 会慢好多倍 （即，和属性选择器组合时候的时候）。如果你用类或者id选择器，比如 `.example { color: red }` ，你就能消除性能损失。[这里有个练习场](http://stevesouders.com/efws/css-selectors/csscreate.php) ，你可以比较测试下其中的差异。
5. **在递归组件中小心后代选择器！** 对于 CSS 规则的选择器 `.a .b`，如果匹配 `.a` 的元素内包含一个递归子组件，那么子组件中所有包含 `.b` 的元素都会被匹配到。



```javascript
        ;(function () {
            function scoper(css) {
                var id = generateID();
                var prefix = "#" + id;
                css = css.replace(/\/\*[\s\S]*?\*\//g, '');  //把样式放到一行
                var re = new RegExp("([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)", "g"); //
                css = css.replace(re, function(g0, g1, g2) {
                    if (g1.match(/^\s*(@media|@keyframes|to|from|@font-face)/)) {
                        return g1 + g2;
                    }
                    if (g1.match(/:scope/)) {
                        g1 = g1.replace(/([^\s]*):scope/, function(h0, h1) {
                            if (h1 === "") {
                                return "> *";
                            } else {
                                return "> " + h1;
                            }
                        });
                    }
                    g1 = g1.replace(/^(\s*)/, "$1" + prefix + " ");
                    return g1 + g2;
                });
                addStyle(css,id+"-style");
                return id;
            }
            function generateID() {
                var id =  ("scoped"+ Math.random()).replace("0.","");
                if(document.getElementById(id)){
                    return generateID();
                }else {
                    return id;
                }
            }
            var isIE = (function () {
                var undef,
                    v = 3,
                    div = document.createElement('div'),
                    all = div.getElementsByTagName('i');
                while (
                    div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
                        all[0]
                    );
                return v > 4 ? v : undef;
            }());
            function addStyle(cssText, id) {
                var d = document,
                    someThingStyles = d.createElement('style');
                d.getElementsByTagName('head')[0].appendChild(someThingStyles);
                someThingStyles.setAttribute('type', 'text/css');
                someThingStyles.setAttribute('id', id);
                if (isIE) {
                    someThingStyles.styleSheet.cssText = cssText;
                } else {
                    someThingStyles.textContent = cssText;
                }
            }
            window.scoper = scoper;
        })();
        
        var id = scoper("h1 {\
                           color:red;\
                        /*color: #0079ff;*/\
                            }\
                    \
                            /*  h2 {\
                            color:green\
                            }*/");
        document.body.getElementsByTagName("div")[0].setAttribute("id",id);
```

