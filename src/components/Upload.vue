<template>
  <div class="upload-img-root">
    <el-select v-show="connected" v-model="selectedSymbol" class="m-2" placeholder="Select" size="large">
      <el-option
        v-for="symbol in symbols"
        :key="symbol"
        :label="`${symbol} ${balanceStack[symbol]}`"
        :value="symbol"
      />
    </el-select>
    <span v-if="connected">{{balance}}</span>
    <br><br>
    <a href="https://app.everpay.io/deposit">Go to deposit by EverPay</a>
    <br><br>
    <b>payload that waiting for upload:</b>
    <div>
      <input v-model="gistId" placeholder="Input gist id">
    </div>
    <button @click="upload_payload()">Click to Upload Your Gists</button>

    <div>
      <ul>
        <li v-for="(order, index) in orders" :key="index">
          <a style="margin-right:10px;" target="_blank" :href="`${arseedUrl}/${order.itemId}`">{{order.itemId}}</a>
          <a target="_blank" :href="`https://arweave.net/${order.itemId}`">By arweave gateway(when onChainStatus pending or success)</a>
          <div>{{JSON.stringify(order, null, 2)}}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import pubsub from 'pubsub-js'
import Everpay from 'everpay'
import { getBundleFee, getOrders } from 'arseeding-js'
import Bignumber from 'bignumber.js'

import axios from 'axios';
import { Octokit } from "@octokit/core";

// TODO: optimize here.
const faasAxios = axios.create({
  //baseURL: "http://localhost:4000/", // local
  baseURL: 'https://faasbyleeduckgo.gigalixirapp.com', // online
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

// import {payOrder} from "arseeding-js/cjs/payOrder";
function getArseedUrl() {
  let arseedUrl = "https://arseed.web3infra.dev"
  const hostname = window.location.hostname
  if ( hostname.split(".")[0].indexOf("dev") !== -1 || hostname === "localhost") { // test env
    arseedUrl = "https://arseed-dev.web3infra.dev"
  }
  return arseedUrl
}

export default {
  name: 'Upload',
  data() {
    return {
      submitResp: "",
      selectedSymbol: '',
      symbols: [],
      connected: false,
      instance: {},
      everpay: {},
      balance: '',
      orders: [],
      balanceStack: {},
      arseedUrl: getArseedUrl(),
      payload: {},
      url: "",
      pat: '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',
      gistId: '',
      gistOwnerId: '',
    };
  },
  watch: {
    selectedSymbol() {
      if (this.everpay.balance && this.selectedSymbol && window.ethereum.selectedAddress) {
        this.everpay.balance({
          symbol: this.selectedSymbol,
          account: window.ethereum.selectedAddress
        }).then(result => {
          this.balance = result
        })
      }
    }
  },
  methods: {
    runFunc(){
        let id = this.$route.query.id;
        let type = this.$route.query.type;
        if(type=="life"){
          this.url = '/api/v1/run?name=PermaLife&func_name=get_life'
        }else{
          this.url = '/api/v1/run?name=PermaLife.Role&func_name=get_role'
        }
        console.log("query id is"+JSON.stringify(this.$route.query.id));
        faasAxios.post(
          this.url,
          {params: [id]},
        ).then(
          value => 
          {
            console.log(value.data);
            this.payload = value.data.result;
          }
        );
    },
    async upload_payload() {
      const fee = await getBundleFee(this.arseedUrl, JSON.stringify(this.payload).length, this.selectedSymbol)
      const formatedFee = new Bignumber(fee.finalFee).dividedBy(new Bignumber(10).pow(fee.decimals)).toString()
      if (+this.balance >= +formatedFee) {
        // const reader = new FileReader();
        // const data = reader.result
        await this.getGists()
        const ops = {
          tags: [
            {name: "Operator",value: "ethereum/" + window.ethereum.selectedAddress}, 
            {name: "Content-Type",value: "application/json"},
            {name: "AppName",value: "FaaS"},
            {name: "GistOwnerId",value: this.gistOwnerId}
          ]
        }
        const res = await this.instance.sendAndPay(this.arseedUrl, this.payload, this.selectedSymbol, ops)
        console.log(res)

        // // ----------- for test bug----------------
        // const cfg =  {
        //   signer: this.instance.signer,
        //   path:"",
        //   arseedUrl: 'https://arseed.web3infra.dev',
        //   currency: 'AR'
        // }
        // const ords = await createAndSubmitItem(this.payload,ops,cfg)
        // console.log('oooood',ords)
        // // const pay = new Everpay({
        // //   account: this.instance.signer.address,
        // //   chainType: 'ethereum' as any,
        // //   ethConnectedSigner: this.instance.signer
        // // })
        // //
        // // const tx = await payOrder(pay,ords)
        // // console.log('tttxxx',tx)
        // // ----------------------------
        // this.submitResp = JSON.stringify(res)
        // this.getOrders()
      } else {
        alert(`need ${formatedFee} ${this.selectedSymbol} to upload`)
      }
    },
    async getOrders() {
      getOrders(this.arseedUrl, window.ethereum.selectedAddress).then(orders => {
        this.orders = orders
      })
    },
    intervalUpdateOrders () {
      setTimeout(() => {
        this.getOrders()
        this.intervalUpdateOrders()
      }, 10000)
    },
    async getBalances() {
      this.everpay.balances({
        account: window.ethereum.selectedAddress
      }).then(balances => {
        const balanceStack = {}
        balances.forEach(balanceItem => {
          balanceStack[balanceItem.symbol] = balanceItem.balance
        })
        this.balanceStack = balanceStack
      })
    },
    async getGists () {
      const octokit = new Octokit({
        auth: this.pat,
      })

      const response = await octokit.request(`GET /gists/${this.gistId}`, {
        gist_id: this.gistId,
      })

      this.gistOwnerId = response.data.history[0].user.id.toString()
      console.log(this.gistOwnerId, typeof this.gistOwnerId)

      this.payload = Buffer.from(JSON.stringify(response.data))
    },
  },
  mounted() {
    this.everpay = new Everpay()

    this.everpay.info().then(info => {
      this.symbols = info.tokenList.map(token => token.symbol)
      this.selectedSymbol = this.symbols[0]
    })

    this.runFunc({ params: [] });

    this.pubId = pubsub.subscribe('connected',async (msgName,data)=>{
      this.connected = true
      this.instance = data
      this.getOrders()
      this.intervalUpdateOrders()
      this.getBalances()
    })
  },
  beforeDestroy() {
    pubsub.unsubscribe(this.pubId)
  },
};
</script>

