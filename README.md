This is a react component that can be used to accept payments using Doogly.

## Peer Dependencies

ethers >= ^6.0.0
react" >= 16.8.0
react-dom >= 16.8.0

## Installation

```
npm i @doogly/react
```

## Usage

### Accepting payments with Doogly

1. Visit https://app.doogly.org and choose the chain and token to receive payments.
2. Add the contract interactions on destination chain if any
3. Choose the widget theme color and get the component
4. The component looks like this:

```javascript
<DooglyButton
  buttonText="ADD DONATE BUTTON TEXT (OPTIONAL)"
  modalTitle="ADD MODAL HEADING (OPTIONAL)"
  // Api url to fetch token and route details
  apiUrl="https://api.doogly.org"
  // Configure modal
  config={{
    destinationChain: "DESTINATION CHAIN ID",
    destinationAddress: "DESTINATION ADDRESS", // Destination address (Dummy if postSwapHook is used)
    destinationOutputTokenAddress: "OUTPUT TOKEN", // Output token at destination
    initialAmount: "DEFAULT INPUT AMOUNT (OPTIONAL)",
    initialChainId: "DEFAULT SOURCE CHAIN ID (OPTIONAL)",
    initialToken: "DEFAULT SOURCE TOKEN (OPTIONAL)",
  }}
  modalStyles={{
    backgroundColor: "MODAL BACKGROUND (OPTIONAL)",
    headingColor: "MODAL HEADING COLOR (OPTIONAL)",
    buttonColor: "MODAL BUTTON COLOR (OPTIONAL)",
    textColor: "MODAL TEXT COLOR (OPTIONAL)",
  }}
  /* Callback function executes on frontend after user executes transaction
  @type ({
          transactionId: string;
          requestId: string;
          fromChainId: string;
          toChainId: string;
          status: string; // ["success", "partial_success", "needs_gas", "not_found"]
        }) => void;
  **/
  callback={"CALLBACK FUNCTION (OPTIONAL)"}
  /* Webhook Url to post transaction details to backend if any once user confirms transaction
  Body - 
  {
    address: string;
    transactionHash: string;
    fromChain: string;
    toChain: string;
    data: additional webhook data
  }
  **/
  webhookUrl="WEBHOOK URL"
  webHookData="ADDITIONAL WEBHOOK DATA"
  /**
  Contract calls to be executed sequentially on destination chain
  @type {
    target: `0x${string}`; // Contract address
    callData: `0x${string}`; // Call data
    callType?: number; // Calltype 0 - Default, 1 - Utilise all the resulting output tokens after bridging + swapping, 2 - Utilize all output native tokens after bridging + swapping
    tokenAddress?: `0x${string}`; // Token address in case calltype is 1
    inputPos?: number; // Input position to dynamically modify with previous call output
  }
   */
  postSwapHook={"HOOKDATA"} // Post swap hook to execute contract calls after swap from bridge itself
  buttonClassName="CHECKOUT BUTTON CLASSNAME"
/>
```
