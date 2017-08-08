<template>
  <div id="app">
    <img src="./assets/logo.png">
    <h1>{{ msg }}</h1>
    <h3>{{count}}</h3>
    <button v-on:click="addcount()">click for add count</button>
    <button v-on:click="addunusedcount()">click for add unusedcount</button>
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: 'app',
  data () {
    return {
      msg: 'This is Father',
      count:0,
      unusedcount:0
    }
  },
  methods:{
      addcount(){
         this.count++;
      },
      addunusedcount(){
          this.unusedcount++;
          console.log('unused-count:',this.unusedcount);
          console.log('unusedcount更新，但dom没有更新')
      }
  },
  updated:()=>{
      console.log('father has updated')
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
