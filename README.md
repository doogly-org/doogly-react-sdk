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
