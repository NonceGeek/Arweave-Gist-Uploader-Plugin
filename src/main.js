import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import App from './App.vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)
Vue.use(ElementUI)
Vue.config.productionTip = false

// const Foo = { template: '<div>foo</div>' }

// const routes = [
//   { path: '', component: App},
//   // { path: '/foo', component: Foo}
// ]

// const router = new VueRouter({
//   routes // short for `routes: routes`
// })
new Vue({
  // router
  render: h => h(App),
}).$mount('#app')
