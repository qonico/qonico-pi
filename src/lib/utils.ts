import { entropyToMnemonic } from 'bip39';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { StdTx } from '@tendermint/sig';

export type BroadcastMode = 'async' | 'block' | 'sync';

export type ICoin = {
  denom: string,
  amount: string,
};

export type AccountDetails = {
  height: string,
  result: {
    type: string,
    value: {
      address: string,
      coins: ICoin[],
      public_key: string,
      account_number: number,
      sequence: number,
    },
  },
};

export const standardRandomBytesFunc = (x: number) => CryptoJS.lib.WordArray.random(x).toString();

export const newMnemonic = (randomBytesFunc = standardRandomBytesFunc): string => {
  const randomBytes = Buffer.from(randomBytesFunc(32), 'hex');
  if (randomBytes.length !== 32) {
    throw Error('Entropy has incorrect length');
  }

  return entropyToMnemonic(randomBytes.toString('hex'));
}

const successResponse = (result: any) => result.data;
const errorResponse = (result: any) => result;

export const getAccountDetails = async (restServer: string, address: string): Promise<AccountDetails> => {
  return axios.get(`${restServer}/auth/accounts/${address}`)
  .then(successResponse)
  .catch(errorResponse);
};

export const broadcast = async (restServer: string, tx: StdTx, mode: BroadcastMode = 'block') => {
  return axios.post(`${restServer}/txs`, {
    tx,
    mode,
  })
  .then(successResponse)
  .catch(errorResponse);
};

export const getDataNode = async(restServer: string, address: string) => {
  return axios.get(`${restServer}/datanode/${address}`)
  .then(successResponse)
  .catch(errorResponse);
}