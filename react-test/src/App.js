import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
 constructor(props){
     super(props);
     this.state={
         fcount:0
     }
 }
 fAdd=()=>{
     this.setState({
         fcount:++this.state.fcount
     })
 }
 componentDidUpdate(){
     console.log('father component update')
 }
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>React Test</h2>
        </div>
        <h2>father count:{this.state.fcount}</h2>
          <button onClick={this.fAdd}>add father count</button>
          <Child></Child>
          <UpdateChild></UpdateChild>
      </div>
    );
  }
}

class Child extends Component{
    state={
        ccount:0
    }

    cAdd=()=>{
        this.setState({
            ccount:++this.state.ccount
        })
    }

    componentDidUpdate(){
        console.log('child1 component update')
    }

    render(){
        return (
        <div>
        <h2>child1 count:{this.state.ccount}</h2>
        <button onClick={this.cAdd}>add child count</button>
        </div>
        )
    }
}

class UpdateChild extends Component{
    state={
        ncount:0,

    }

    nAdd=()=>{
        this.setState({
            ncount:++this.state.ncount
        })
    }



    componentDidUpdate(){
        console.log('child2 component  update')
    }

    shouldComponentUpdate(nextProps,nextState){
        if(nextState.Number === this.state.Number){
            return false
        }
        return true
    }

    render(){
        return (
            <div>
                <h2>child2 count:{this.state.ncount}</h2>
                <button onClick={this.nAdd}>add child count</button>
            </div>
        )
    }
}

export default App;
