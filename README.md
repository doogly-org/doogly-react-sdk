This is a react component that can be used to accept donations using Doogly.

## Peer Dependencies

ethers >= ^6.0.0
react" >= 16.8.0
react-dom >= 16.8.0

## Installation

```
npm i @doogly/doogly-donate-component
```

## Usage

### Accepting donations and distributing hypercerts

1. Visit https://app.doogly.org and create project after filling all the details.
2. Approve the hypercert transfer by Doogly by clicking "Approve Hypercert Transfer" button
3. Click on "Get Donation Widget" to get the widget component to embed to your react app.
4. The component looks like this:

```javascript
<DooglyDonateButton
  buttonText="<ADD YOUR BUTTON TEXT>"
  modalTitle="<ADD MODAL TITLE>"
  config={{
    destinationChain: "<ADD DESTINATION CHAIN TO RECEIVE DONATIONS>",
    destinationAddress: "<DOOGLY GATEWAY CONTRACT ON DESTINATION CHAIN>",
    splitsAddress: "<DONATION RECEIVING ADDRESS>",
    hypercertFractionId: "<HYPERCERT ID (you get from https://app.doogly.org)>",
    poolId: "<ALLO POOL ID IF RECEIVING ON ALLO POOL ELSE 0>",
    destinationOutputTokenAddress:
      "<TOKEN ADDRESS YOU WANT TO RECEIVE DONATIONS IN>",
  }}
  buttonClassName="<BUTTON CLASSNAME>"
  modalStyles={{
    backgroundColor: "<BACKGROUND COLOR>",
    headingColor: "<HEADING COLOR>",
    buttonColor: "<BUTTON COLOR>",
  }}
/>
```

### Receiving donations and not distribute hypercerts

To receive donations and not disburse hypercerts you can use Doogly tipping component

```javascript
<DooglyTippingButton
  buttonText="<ADD YOUR BUTTON TEXT>"
  modalTitle="<ADD MODAL TITLE>"
  config={{
    destinationChain: "<ADD DESTINATION CHAIN TO RECEIVE DONATIONS>",
    destinationAddress: "<DOOGLY GATEWAY CONTRACT ON DESTINATION CHAIN>",
    receiverAddress: "<DONATION RECEIVING ADDRESS>",
    destinationOutputTokenAddress:
      "<TOKEN ADDRESS YOU WANT TO RECEIVE DONATIONS IN>",
  }}
  buttonClassName="<BUTTON CLASSNAME>"
  modalStyles={{
    backgroundColor: "<BACKGROUND COLOR>",
    headingColor: "<HEADING COLOR>",
    buttonColor: "<BUTTON COLOR>",
  }}
/>
```

### Doogly Gateway contract deployments

|   Chain   |                                                         Contract Address                                                         |
| :-------: | :------------------------------------------------------------------------------------------------------------------------------: |
| Optimism  | [0x3652eC40C4D8F3e804373455EF155777F250a6E2](https://optimistic.etherscan.io/address/0x3652eC40C4D8F3e804373455EF155777F250a6E2) |
|   Base    |      [0xe0E84235511aC6437C756C1d70e8cCdd8917df36](https://basescan.org/address/0xe0E84235511aC6437C756C1d70e8cCdd8917df36)       |
|   Celo    |       [0xFa1aD6310C6540c5430F9ddA657FCE4BdbF1f4df](https://celoscan.io/address/0xFa1aD6310C6540c5430F9ddA657FCE4BdbF1f4df)       |
| Arbitrum  |       [0xb66f6DAC6F61446FD88c146409dA6DA8F8F10f73](https://arbiscan.io/address/0xb66f6DAC6F61446FD88c146409dA6DA8F8F10f73)       |
|  Polygon  |     [0x1E1461464852d6FbF8a19097d14408d657d49457](https://polygonscan.com/address/0x1E1461464852d6FbF8a19097d14408d657d49457)     |
| Avalanche |      [0x1E1461464852d6FbF8a19097d14408d657d49457](https://snowtrace.io/address/0x1E1461464852d6FbF8a19097d14408d657d49457)       |
|    BNB    |       [0x73F9fEBd723ebcaa23A6DEd587afbF2a503B303f](https://bscscan.com/address/0x73F9fEBd723ebcaa23A6DEd587afbF2a503B303f)       |
