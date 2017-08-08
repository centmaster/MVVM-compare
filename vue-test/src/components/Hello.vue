<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <h3>{{count}}</h3>
    <button @click="addcount()">click for add count</button>

  </div>
</template>

<script>
export default {
  name: 'hello',
  data () {
    return {
      msg: 'This is child',
      count:0
    }
  },
  methods:{
    addcount(count){
      this.count++;
    }
  },
  updated:()=>{
    console.log('child has updated')
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}
</style>
