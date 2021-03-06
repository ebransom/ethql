import Contract from 'web3/eth/contract';
import EthqlAccount from '../../model/core/EthqlAccount';
import EthqlTransaction from '../../model/core/EthqlTransaction';
import { EthqlContext } from '../../model/EthqlContext';
import { TxDecoderDefinition } from '../types';
import { createAbiDecoder, extractParamValue } from '../utils';

interface Erc20Transaction {
  tokenContract: Erc20TokenContract;
}

class Erc20TokenContract {
  private static ABI = require(__dirname + '../../../abi/erc20.json');
  private _contract: Contract;

  constructor(public readonly account: EthqlAccount, readonly context: EthqlContext) {
    this._contract = new context.web3.eth.Contract(Erc20TokenContract.ABI, account.address);
  }

  public async symbol() {
    return this._contract.methods
      .symbol()
      .call()
      .catch(() => undefined);
  }

  public async totalSupply() {
    return this._contract.methods
      .totalSupply()
      .call()
      .catch(() => undefined);
  }

  public async balanceOf({ address }: { address: string }) {
    return this._contract.methods
      .balanceOf(address)
      .call()
      .catch(() => undefined);
  }
}

class Erc20TokenHolder {
  constructor(public readonly account: EthqlAccount, private readonly contract: Erc20TokenContract) {}

  public async tokenBalance() {
    return this.contract.balanceOf({ ...this.account });
  }
}

interface Erc20Transfer extends Erc20Transaction {
  from: Erc20TokenHolder;
  to: Erc20TokenHolder;
  value: string;
}

interface Erc20Approve extends Erc20Transaction {
  from: Erc20TokenHolder;
  spender: Erc20TokenHolder;
  value: string;
}

interface Erc20TransferFrom extends Erc20Transaction {
  from: Erc20TokenHolder;
  to: Erc20TokenHolder;
  spender: Erc20TokenHolder;
  value: string;
}

type Erc20Bindings = {
  transfer: Erc20Transfer;
  approve: Erc20Approve;
  transferFrom: Erc20TransferFrom;
};

/**
 * ERC20 transaction decoder.
 */
class Erc20 implements TxDecoderDefinition<Erc20Bindings> {
  public readonly standard = 'ERC20';
  public readonly decoder = createAbiDecoder(__dirname + '../../../abi/erc20.json');

  public readonly transformers = {
    transfer: (decoded: any, tx: EthqlTransaction, context: EthqlContext) => {
      const tokenContract = new Erc20TokenContract(tx.to, context);
      const to = new EthqlAccount(extractParamValue(decoded.params, 'to'));
      return {
        tokenContract,
        from: new Erc20TokenHolder(tx.from, tokenContract),
        value: extractParamValue(decoded.params, 'value'),
        to: new Erc20TokenHolder(to, tokenContract),
      };
    },

    approve: (decoded: any, tx: EthqlTransaction, context: EthqlContext) => {
      const tokenContract = new Erc20TokenContract(tx.to, context);
      const spender = new EthqlAccount(extractParamValue(decoded.params, 'spender'));
      return {
        tokenContract,
        from: new Erc20TokenHolder(tx.from, tokenContract),
        value: extractParamValue(decoded.params, 'value'),
        spender: new Erc20TokenHolder(spender, tokenContract),
      };
    },

    transferFrom: (decoded: any, tx: EthqlTransaction, context: EthqlContext) => {
      const tokenContract = new Erc20TokenContract(tx.to, context);
      const from = new EthqlAccount(extractParamValue(decoded.params, 'from'));
      const to = new EthqlAccount(extractParamValue(decoded.params, 'to'));
      const spender = tx.from;
      return {
        tokenContract,
        from: new Erc20TokenHolder(from, tokenContract),
        to: new Erc20TokenHolder(to, tokenContract),
        spender: new Erc20TokenHolder(spender, tokenContract),
        value: extractParamValue(decoded.params, 'value'),
      };
    },
  };
}

export default Erc20;
