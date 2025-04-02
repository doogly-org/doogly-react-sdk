import { VersionedTransaction } from "@solana/web3.js";
import {
  ExecuteRoute,
  OnChainExecutionData,
  PhantomSigner,
  SolanaSigner,
  SolanaTxResponse,
} from "../types";

export class SolanaHandler {
  async executeRoute({
    data,
  }: {
    data: ExecuteRoute;
  }): Promise<SolanaTxResponse> {
    const { route } = data;
    const signer = data.signer as SolanaSigner;

    // currently we support signing only for Jupiter
    const swapRequest = (route.transactionRequest! as OnChainExecutionData)
      .data;

    // build tx object
    const swapTransactionBuf = Buffer.from(swapRequest, "base64");
    let transaction = VersionedTransaction.deserialize(
      new Uint8Array(swapTransactionBuf)
    );

    let tx: string;

    // phantom wallet signer
    const { signature } = await (
      signer as PhantomSigner
    ).signAndSendTransaction(transaction);

    tx = signature;

    return { tx };
  }
}
